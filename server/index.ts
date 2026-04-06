import cors from 'cors';
import express from 'express';
import { accessSync, constants, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import type {
  DownloadVideoRequest,
  DownloadVideoResponse,
  VideoTranscodePreset,
} from '../src/types/video.js';
import { buildIdentifier } from '../src/types/video.js';
import type {
  HelperCleanupResponse,
  HelperDependencyStatus,
  HelperHealthResponse,
} from '../src/types/helper.js';

const app = express();
app.set('trust proxy', true);

const PORT = Number(process.env.PORT || 3001);
const DOWNLOAD_TTL_MS = Number(process.env.DOWNLOAD_TTL_MS || 1000 * 60 * 30);
const MAX_ACTIVE_JOBS = Number(process.env.MAX_ACTIVE_JOBS || 1);
const MAX_QUEUED_JOBS = Number(process.env.MAX_QUEUED_JOBS || 2);
const MAX_PREPARED_DOWNLOADS = Number(process.env.MAX_PREPARED_DOWNLOADS || 6);
const MAX_VIDEO_DURATION_SECONDS = Number(
  process.env.MAX_VIDEO_DURATION_SECONDS || 60 * 60 * 2
);
const YT_DLP_COOKIES_FILE = process.env.YT_DLP_COOKIES_FILE?.trim() || '';
const YT_DLP_COOKIES_FROM_BROWSER =
  process.env.YT_DLP_COOKIES_FROM_BROWSER?.trim() || '';
const YT_DLP_JS_RUNTIMES = process.env.YT_DLP_JS_RUNTIMES?.trim() || 'node';
const TRANSCODE_PROFILE =
  process.env.TRANSCODE_PROFILE?.trim() || 'workflow-test';
const DEFAULT_TRANSCODE_PRESET = (
  process.env.DEFAULT_TRANSCODE_PRESET?.trim() || 'balanced'
) as VideoTranscodePreset;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const bundledYtDlpPath = path.resolve(
  process.cwd(),
  'node_modules/youtube-dl-exec/bin/yt-dlp'
);

const resolveYtDlpBinary = () => {
  if (process.env.YT_DLP_BIN) {
    return process.env.YT_DLP_BIN;
  }

  try {
    accessSync(bundledYtDlpPath, constants.X_OK);
    return bundledYtDlpPath;
  } catch {
    return 'yt-dlp';
  }
};

const resolveFfmpegBinary = () => process.env.FFMPEG_BIN?.trim() || 'ffmpeg';

const YT_DLP_BIN = resolveYtDlpBinary();
const FFMPEG_BIN = resolveFfmpegBinary();

const getYtDlpBaseArgs = () => {
  const args: string[] = [];

  if (YT_DLP_JS_RUNTIMES) {
    args.push('--js-runtimes', YT_DLP_JS_RUNTIMES);
  }

  if (YT_DLP_COOKIES_FILE) {
    args.push('--cookies', YT_DLP_COOKIES_FILE);
    return args;
  }

  if (YT_DLP_COOKIES_FROM_BROWSER) {
    args.push('--cookies-from-browser', YT_DLP_COOKIES_FROM_BROWSER);
  }

  return args;
};

const TRANSCODE_PRESETS: Record<
  VideoTranscodePreset,
  {
    description: string;
    height: number;
    label: string;
    scaleDownOnly: boolean;
    width: number;
  }
> = {
  small: {
    label: 'Small',
    description: 'Lowest storage usage. Good for long archive imports.',
    width: 960,
    height: 540,
    scaleDownOnly: true,
  },
  balanced: {
    label: 'Balanced',
    description: 'Recommended default for most Qortal creator uploads with minimal extra processing.',
    width: 1280,
    height: 720,
    scaleDownOnly: true,
  },
  'high-quality': {
    label: 'High Quality',
    description: 'Higher bitrate and larger frame size for premium releases.',
    width: 1920,
    height: 1080,
    scaleDownOnly: true,
  },
};

const preparedDownloads = new Map<
  string,
  {
    directory: string;
    expiresAt: number;
    filePath: string;
    filename: string;
  }
>();
const waitingJobs: Array<() => void> = [];
let activeJobs = 0;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by helper CORS policy.'));
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Cache-Control', 'no-store');
  next();
});

type YtDlpMetadata = {
  id?: string;
  title?: string;
  description?: string;
  duration?: number | null;
  thumbnail?: string;
  channel?: string;
  uploader?: string;
  upload_date?: string;
};

const isSupportedYouTubeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'www.youtube.com' ||
        url.hostname === 'youtube.com' ||
        url.hostname === 'm.youtube.com' ||
        url.hostname === 'youtu.be')
    );
  } catch {
    return false;
  }
};

const resolvePublicBaseUrl = (request: express.Request<any, any, any, any>) =>
  `${request.protocol}://${request.get('host')}`;

const releaseJobSlot = () => {
  activeJobs = Math.max(0, activeJobs - 1);
  const nextJob = waitingJobs.shift();

  if (nextJob) {
    activeJobs += 1;
    nextJob();
  }
};

const acquireJobSlot = async () => {
  if (activeJobs < MAX_ACTIVE_JOBS) {
    activeJobs += 1;
    return;
  }

  if (waitingJobs.length >= MAX_QUEUED_JOBS) {
    throw new Error('Local helper queue is full. Wait for the current job to finish.');
  }

  await new Promise<void>((resolve) => {
    waitingJobs.push(resolve);
  });
};

const runCommand = (
  binary: string,
  args: string[],
  workingDirectory: string
) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: workingDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(stderr.trim() || `${binary} exited with non-zero status code ${code}.`)
      );
    });
  });

const runProgressCommand = (
  binary: string,
  args: string[],
  workingDirectory: string,
  options: {
    logPrefix: string;
    onProgressLine?: (line: string) => void;
  }
) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: workingDirectory,
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    let lineBuffer = '';

    const flushLine = (line: string) => {
      if (!line) {
        return;
      }

      options.onProgressLine?.(line);
    };

    child.stderr.on('data', (chunk) => {
      const value = chunk.toString();
      stderr += value;
      lineBuffer += value;

      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() || '';

      lines.forEach(flushLine);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      flushLine(lineBuffer.trim());

      if (code === 0) {
        console.log(`${options.logPrefix} completed.`);
        resolve();
        return;
      }

      reject(
        new Error(stderr.trim() || `${binary} exited with non-zero status code ${code}.`)
      );
    });
  });

const checkBinary = async (
  binary: string,
  args: string[]
): Promise<HelperDependencyStatus> => {
  try {
    await runCommand(binary, args, process.cwd());
    return {
      available: true,
      binary,
    };
  } catch (caughtError) {
    return {
      available: false,
      binary,
      error:
        caughtError instanceof Error
          ? caughtError.message
          : `Could not execute ${binary}.`,
    };
  }
};

const getDependencyStatus = async () => ({
  ytDlp: await checkBinary(YT_DLP_BIN, ['--version']),
  ffmpeg: await checkBinary(FFMPEG_BIN, ['-version']),
});

const ensureDependenciesAvailable = async () => {
  const dependencies = await getDependencyStatus();

  if (!dependencies.ytDlp.available) {
    throw new Error(
      `yt-dlp is not available. Install it locally or set YT_DLP_BIN. ${dependencies.ytDlp.error || ''}`.trim()
    );
  }

  if (!dependencies.ffmpeg.available) {
    throw new Error(
      `ffmpeg is not available. Install it locally or set FFMPEG_BIN. ${dependencies.ffmpeg.error || ''}`.trim()
    );
  }
};

const normalizePreset = (value?: string): VideoTranscodePreset =>
  value && value in TRANSCODE_PRESETS
    ? (value as VideoTranscodePreset)
    : DEFAULT_TRANSCODE_PRESET in TRANSCODE_PRESETS
      ? DEFAULT_TRANSCODE_PRESET
      : 'balanced';

const extractMetadata = async (url: string, workingDirectory: string) => {
  const { stdout } = await runCommand(
    YT_DLP_BIN,
    [
      ...getYtDlpBaseArgs(),
      '--print-json',
      '--skip-download',
      '--no-warnings',
      url,
    ],
    workingDirectory
  );

  return JSON.parse(stdout) as YtDlpMetadata;
};

const extractMetadataWithRetry = async (url: string, workingDirectory: string) => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await extractMetadata(url, workingDirectory);
    } catch (caughtError) {
      lastError = caughtError;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not read metadata from yt-dlp.');
};

const downloadVideo = async (
  url: string,
  identifier: string,
  workingDirectory: string
) => {
  const outputTemplate = `${identifier}-source.%(ext)s`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await runCommand(
        YT_DLP_BIN,
        [
          ...getYtDlpBaseArgs(),
          '--no-playlist',
          '-f',
          '18/22/b[ext=mp4][height<=1080]/b[height<=1080]/bestvideo[height<=1080]+bestaudio/best',
          '--merge-output-format',
          'mp4',
          '-o',
          outputTemplate,
          url,
        ],
        workingDirectory
      );

      const files = await fs.readdir(workingDirectory);
      const matched = files.find(
        (file) => file.startsWith(`${identifier}-source`) && file.endsWith('.mp4')
      );

      if (!matched) {
        throw new Error('yt-dlp finished, but no MP4 source file was created.');
      }

      return path.join(workingDirectory, matched);
    } catch (caughtError) {
      lastError = caughtError;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not download the source video.');
};

const formatProgressValue = (key: string, value: string) => {
  if (key === 'out_time') {
    return value;
  }

  if (key === 'speed') {
    return value;
  }

  if (key === 'fps') {
    return `${value} fps`;
  }

  return value;
};

const buildCodecArgs = (presetKey: VideoTranscodePreset) => {
  if (TRANSCODE_PROFILE === 'qortal-final') {
    const presetMap: Record<
      VideoTranscodePreset,
      {
        audioBitrate: string;
        crf: number;
        encoderPreset: number;
        videoBitrate: string;
      }
    > = {
      small: {
        videoBitrate: '300k',
        audioBitrate: '64k',
        encoderPreset: 13,
        crf: 36,
      },
      balanced: {
        videoBitrate: '333k',
        audioBitrate: '96k',
        encoderPreset: 12,
        crf: 34,
      },
      'high-quality': {
        videoBitrate: '666k',
        audioBitrate: '128k',
        encoderPreset: 10,
        crf: 30,
      },
    };
    const preset = presetMap[presetKey];

    return [
      '-c:v',
      'libsvtav1',
      '-svtav1-params',
      `rc=1:preset=${preset.encoderPreset}`,
      '-b:v',
      preset.videoBitrate,
      '-crf',
      String(preset.crf),
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'libopus',
      '-b:a',
      preset.audioBitrate,
    ];
  }

  const presetMap: Record<
    VideoTranscodePreset,
    {
      audioBitrate: string;
      crf: number;
      preset: string;
      videoBitrate: string;
    }
  > = {
    small: {
      videoBitrate: '280k',
      audioBitrate: '64k',
      preset: 'ultrafast',
      crf: 34,
    },
    balanced: {
      videoBitrate: '420k',
      audioBitrate: '96k',
      preset: 'superfast',
      crf: 30,
    },
    'high-quality': {
      videoBitrate: '900k',
      audioBitrate: '128k',
      preset: 'veryfast',
      crf: 26,
    },
  };
  const preset = presetMap[presetKey];

  return [
    '-c:v',
    'libx264',
    '-preset',
    preset.preset,
    '-tune',
    'fastdecode',
    '-b:v',
    preset.videoBitrate,
    '-crf',
    String(preset.crf),
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    preset.audioBitrate,
    '-movflags',
    '+faststart',
  ];
};

const transcodeVideo = async (
  inputPath: string,
  identifier: string,
  workingDirectory: string,
  presetKey: VideoTranscodePreset,
  title: string
) => {
  const preset = TRANSCODE_PRESETS[presetKey];
  const outputPath = path.join(workingDirectory, `${identifier}.mp4`);
  const codecArgs = buildCodecArgs(presetKey);
  const scaleFilter = preset.scaleDownOnly
    ? `scale='min(iw,${preset.width})':'min(ih,${preset.height})':force_original_aspect_ratio=decrease:force_divisible_by=2`
    : `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`;
  const jobLabel = `[transcode:${presetKey}:${TRANSCODE_PROFILE}]`;

  console.log(
    `${jobLabel} starting with preset "${preset.label}" for ${path.basename(inputPath)}`
  );

  await runProgressCommand(
    FFMPEG_BIN,
    [
      '-hide_banner',
      '-y',
      '-nostats',
      '-progress',
      'pipe:2',
      '-i',
      inputPath,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-vf',
      scaleFilter,
      ...codecArgs,
      '-metadata',
      `title=${title}`,
      outputPath,
    ],
    workingDirectory,
    {
      logPrefix: jobLabel,
      onProgressLine: (line) => {
        if (!line.includes('=')) {
          return;
        }

        const [key, rawValue] = line.split('=');
        const value = rawValue?.trim() || '';

        if (key === 'progress') {
          console.log(`${jobLabel} ${value}`);
          return;
        }

        if (key === 'out_time' || key === 'fps' || key === 'speed') {
          console.log(`${jobLabel} ${key}: ${formatProgressValue(key, value)}`);
        }
      },
    }
  );

  return outputPath;
};

const scheduleCleanup = (downloadId: string) => {
  setTimeout(async () => {
    const download = preparedDownloads.get(downloadId);

    if (!download || download.expiresAt > Date.now()) {
      return;
    }

    preparedDownloads.delete(downloadId);
    await fs.rm(download.directory, { recursive: true, force: true });
  }, DOWNLOAD_TTL_MS + 5000);
};

app.get(
  '/health',
  async (_request, response: express.Response<HelperHealthResponse>) => {
    const dependencies = await getDependencyStatus();
    const defaultPreset = normalizePreset();

    response.json({
      ok: dependencies.ytDlp.available && dependencies.ffmpeg.available,
      mode: 'local',
      port: PORT,
      helperUrl: `http://127.0.0.1:${PORT}`,
      preparedDownloads: preparedDownloads.size,
      activeJobs,
      queuedJobs: waitingJobs.length,
      maxVideoDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
      defaultPreset,
      availablePresets: Object.keys(TRANSCODE_PRESETS) as VideoTranscodePreset[],
      dependencies,
    });
  }
);

app.post(
  '/cleanup',
  async (_request, response: express.Response<HelperCleanupResponse>) => {
    const downloads = Array.from(preparedDownloads.values());
    const clearedPreparedDownloads = downloads.length;

    preparedDownloads.clear();
    await Promise.all(
      downloads.map((download) =>
        fs.rm(download.directory, { recursive: true, force: true }).catch(() => undefined)
      )
    );

    response.json({
      success: true,
      clearedPreparedDownloads,
    });
  }
);

app.get('/downloaded/:downloadId', (request, response) => {
  const download = preparedDownloads.get(request.params.downloadId);

  if (!download) {
    response.status(404).json({
      message: 'Prepared download not found or it has expired.',
    });
    return;
  }

  response.setHeader('Content-Type', 'video/mp4');
  response.sendFile(download.filePath);
});

app.delete('/downloaded/:downloadId', async (request, response) => {
  const download = preparedDownloads.get(request.params.downloadId);

  if (!download) {
    response.status(404).json({
      message: 'Prepared download not found or it has already been deleted.',
    });
    return;
  }

  preparedDownloads.delete(request.params.downloadId);
  await fs.rm(download.directory, { recursive: true, force: true });

  response.json({ success: true });
});

app.post(
  '/download',
  async (
    request: express.Request<unknown, unknown, DownloadVideoRequest>,
    response: express.Response<DownloadVideoResponse | { message: string }>
  ) => {
    const { address, identifier, name, publicKey, url, visibility, transcodePreset } =
      request.body;

    if (!url || !name || !address || !publicKey) {
      response.status(400).json({
        message: 'url, name, address, and publicKey are required.',
      });
      return;
    }

    if (!isSupportedYouTubeUrl(url)) {
      response.status(400).json({
        message: 'Only valid YouTube HTTPS URLs are supported.',
      });
      return;
    }

    if (preparedDownloads.size >= MAX_PREPARED_DOWNLOADS) {
      response.status(503).json({
        message: 'Local helper storage is temporarily full. Run helper cleanup and retry.',
      });
      return;
    }

    const resolvedIdentifier = identifier || buildIdentifier(url);
    const tempDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `videobox-bridge-${resolvedIdentifier}-`)
    );
    const resolvedPreset = normalizePreset(transcodePreset);
    let hasAcquiredJobSlot = false;

    try {
      await ensureDependenciesAvailable();
      await acquireJobSlot();
      hasAcquiredJobSlot = true;

      const ytMetadata = await extractMetadataWithRetry(url, tempDirectory);

      if (
        typeof ytMetadata.duration === 'number' &&
        ytMetadata.duration > MAX_VIDEO_DURATION_SECONDS
      ) {
        response.status(400).json({
          message: `Video is too long. Maximum allowed duration is ${Math.floor(
            MAX_VIDEO_DURATION_SECONDS / 60
          )} minutes on this local helper.`,
        });
        return;
      }

      const sourceFilePath = await downloadVideo(url, resolvedIdentifier, tempDirectory);
      const transcodedFilePath = await transcodeVideo(
        sourceFilePath,
        resolvedIdentifier,
        tempDirectory,
        resolvedPreset,
        ytMetadata.title || resolvedIdentifier
      );
      const filename = path.basename(transcodedFilePath);
      const downloadId = crypto.randomUUID();
      const publicBaseUrl = resolvePublicBaseUrl(request);

      preparedDownloads.set(downloadId, {
        directory: tempDirectory,
        expiresAt: Date.now() + DOWNLOAD_TTL_MS,
        filePath: transcodedFilePath,
        filename,
      });
      scheduleCleanup(downloadId);

      response.json({
        success: true,
        message: `Video prepared locally with the ${TRANSCODE_PRESETS[resolvedPreset].label} preset. Approve the Qortal publish request to continue.`,
        identifier: resolvedIdentifier,
        downloadId,
        downloadUrl: `${publicBaseUrl}/downloaded/${downloadId}`,
        qdnUrl: `/arbitrary/VIDEO/${name}/${resolvedIdentifier}`,
        videoMetadata: {
          videoId: ytMetadata.id || resolvedIdentifier,
          sourceUrl: url,
          title: ytMetadata.title || resolvedIdentifier,
          description: ytMetadata.description || '',
          duration: ytMetadata.duration ?? null,
          identifier: resolvedIdentifier,
          visibility: visibility === 'private' ? 'private' : 'public',
          thumbnailUrl: ytMetadata.thumbnail,
          channelName: ytMetadata.channel || ytMetadata.uploader,
          originalPublishDate: ytMetadata.upload_date || undefined,
          transcodePreset: resolvedPreset,
          stats: {
            likes: 0,
            shares: 0,
            tips: 0,
          },
          publisher: {
            name,
            address,
            publicKey,
          },
          qdn: {
            service: 'VIDEO',
            name,
            identifier: resolvedIdentifier,
          },
          createdAt: new Date().toISOString(),
          localFilename: filename,
        },
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Video processing failed.';

      await fs.rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined);
      response.status(message.includes('queue is full') ? 429 : 500).json({
        message,
      });
    } finally {
      if (hasAcquiredJobSlot) {
        releaseJobSlot();
      }
    }
  }
);

void getDependencyStatus().then((dependencies) => {
  if (!dependencies.ytDlp.available) {
    console.warn(`yt-dlp unavailable at startup: ${dependencies.ytDlp.error}`);
  }

  if (!dependencies.ffmpeg.available) {
    console.warn(`ffmpeg unavailable at startup: ${dependencies.ffmpeg.error}`);
  }
});

app.listen(PORT, () => {
  console.log(
    `Video helper listening on http://127.0.0.1:${PORT} in local creator mode`
  );
});
