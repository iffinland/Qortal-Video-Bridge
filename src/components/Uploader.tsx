import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { formatDuration } from 'qapp-core';
import { useEffect, useMemo, useState } from 'react';
import { useHelperMonitor } from '../hooks/useHelperMonitor';
import { useVideoPublish } from '../hooks/useVideoPublish';
import type { VideoMetadata, VideoTranscodePreset } from '../types/video';
import {
  VIDEO_IDENTIFIER_PREFIX,
  type VideoTranscodePresetOption,
} from '../types/video';
import {
  deleteVideoResources,
  publishVideoMetadataResource,
} from '../utils/metadata';
import { EditVideoDialog } from './EditVideoDialog';
import { VideoCard } from './VideoCard';

const extractVideoFingerprint = (value: string) => {
  try {
    const url = new URL(value.trim());

    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1);
    }

    return url.searchParams.get('v') || value.trim();
  } catch {
    return value.trim();
  }
};

const DASHBOARD_PAGE_SIZE = 9;

const TRANSCODE_PRESET_OPTIONS: VideoTranscodePresetOption[] = [
  {
    key: 'small',
    label: 'Small',
    description: 'Lowest storage usage for long archive imports.',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    description: 'Recommended default for most Qortal creator uploads.',
  },
  {
    key: 'high-quality',
    label: 'High Quality',
    description: 'Higher bitrate and frame size for premium releases.',
  },
];

const isManagedVideo = (video: VideoMetadata) =>
  video.identifier.startsWith(`${VIDEO_IDENTIFIER_PREFIX}-`);

interface DashboardListItemProps {
  onDelete: (video: VideoMetadata) => Promise<void>;
  onEdit: (video: VideoMetadata) => void;
  onToggleVisibility: (video: VideoMetadata) => Promise<void>;
  deleteBusy: boolean;
  visibilityBusy: boolean;
  video: VideoMetadata;
}

const DashboardListItem = ({
  onDelete,
  onEdit,
  onToggleVisibility,
  deleteBusy,
  visibilityBusy,
  video,
}: DashboardListItemProps) => {
  return (
    <VideoCard
      video={video}
      mode="dashboard"
      onDelete={onDelete}
      onEdit={onEdit}
      onToggleVisibility={() => onToggleVisibility(video)}
      deleteBusy={deleteBusy}
      visibilityBusy={visibilityBusy}
    />
  );
};

interface SearchResourceResult {
  identifier: string;
  name: string;
  service: 'JSON';
}

const parseFetchedVideo = (value: unknown): VideoMetadata | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as VideoMetadata;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value as VideoMetadata;
  }

  return null;
};

const Uploader = () => {
  const [url, setUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [transcodePreset, setTranscodePreset] =
    useState<VideoTranscodePreset>('balanced');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>(
    'all'
  );
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [helperActionMessage, setHelperActionMessage] = useState<string | null>(null);
  const [knownVideos, setKnownVideos] = useState<Record<string, VideoMetadata>>({});
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoMetadata | null>(null);
  const [deletedVideoIds, setDeletedVideoIds] = useState<Record<string, true>>({});
  const [page, setPage] = useState(1);
  const { canPublish, job, lastPublishedVideo, primaryName, publishVideo } =
    useVideoPublish();
  const {
    actionError,
    cleanupHelper,
    error: helperError,
    health,
    isLoadingHealth,
    isRunningCleanup,
    loadHealth,
  } = useHelperMonitor();

  const isBusy =
    job.phase === 'downloading' ||
    job.phase === 'preparing-upload' ||
    job.phase === 'waiting-for-approval' ||
    job.phase === 'publishing-metadata';
  const libraryVideos = Object.values(knownVideos);
  const publicCount = libraryVideos.filter((video) => video.visibility === 'public').length;
  const privateCount = libraryVideos.filter((video) => video.visibility === 'private').length;
  const presetSummary =
    TRANSCODE_PRESET_OPTIONS.find((option) => option.key === transcodePreset) ||
    TRANSCODE_PRESET_OPTIONS[1];
  const visibleDashboardVideos = useMemo(() => {
    return libraryVideos
      .filter(
        (video) =>
          !deletedVideoIds[video.identifier] &&
          (visibilityFilter === 'all' || video.visibility === visibilityFilter)
      )
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [deletedVideoIds, libraryVideos, visibilityFilter]);
  const totalPages = Math.max(1, Math.ceil(visibleDashboardVideos.length / DASHBOARD_PAGE_SIZE));
  const currentPageIdentifiers = useMemo(
    () =>
      new Set(
        visibleDashboardVideos
          .slice(
            (page - 1) * DASHBOARD_PAGE_SIZE,
            (page - 1) * DASHBOARD_PAGE_SIZE + DASHBOARD_PAGE_SIZE
          )
          .map((video) => video.identifier)
      ),
    [page, visibleDashboardVideos]
  );
  const currentPageCount = currentPageIdentifiers.size;

  useEffect(() => {
    setPage(1);
  }, [visibilityFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (health?.defaultPreset) {
      setTranscodePreset(health.defaultPreset);
    }
  }, [health?.defaultPreset]);

  const handleCleanupHelper = async () => {
    try {
      const result = await cleanupHelper();
      setHelperActionMessage(
        `Local helper cleanup finished. Removed ${result.clearedPreparedDownloads} prepared download(s).`
      );
    } catch {
      return;
    }
  };

  const handleProcessVideo = async () => {
    const trimmedUrl = url.trim();
    const nextFingerprint = extractVideoFingerprint(trimmedUrl);
    const duplicate = Object.values(knownVideos).find(
      (video) =>
        video.sourceUrl.trim() === trimmedUrl ||
        extractVideoFingerprint(video.sourceUrl) === nextFingerprint
    );

    if (duplicate) {
      setDuplicateWarning(
        `This YouTube URL is already in your dashboard as "${duplicate.title}".`
      );
      return;
    }

    setDuplicateWarning(null);
    const result = await publishVideo(
      url,
      isPublic ? 'public' : 'private',
      transcodePreset
    );

    if (result?.success) {
      setUrl('');
      setKnownVideos((current) => ({
        ...current,
        [result.videoMetadata.identifier]: result.videoMetadata,
      }));
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadKnownVideos = async () => {
      if (!primaryName) {
        setKnownVideos({});
        return;
      }

      try {
        const resources = (await qortalRequest({
          action: 'SEARCH_QDN_RESOURCES',
          service: 'JSON',
          includeMetadata: true,
          limit: 100,
          mode: 'LATEST',
          name: primaryName,
        })) as SearchResourceResult[];
        const managedResources = (resources || []).filter((resource) =>
          resource.identifier.startsWith(`${VIDEO_IDENTIFIER_PREFIX}-`)
        );
        const fetchedVideos = await Promise.allSettled(
          managedResources.map(async (resource) => {
            const response = await qortalRequest({
              action: 'FETCH_QDN_RESOURCE',
              service: 'JSON',
              name: resource.name,
              identifier: resource.identifier,
            });

            return parseFetchedVideo(response);
          })
        );

        if (cancelled) {
          return;
        }

        const nextKnownVideos = fetchedVideos.reduce<Record<string, VideoMetadata>>(
          (accumulator, video) => {
            if (video.status !== 'fulfilled' || !video.value || !isManagedVideo(video.value)) {
              return accumulator;
            }

            const current = accumulator[video.value.identifier];

            if (
              !current ||
              new Date(video.value.createdAt).getTime() > new Date(current.createdAt).getTime()
            ) {
              accumulator[video.value.identifier] = video.value;
            }

            return accumulator;
          },
          {}
        );

        setKnownVideos(nextKnownVideos);
      } catch {
        if (!cancelled) {
          setKnownVideos({});
        }
      }
    };

    void loadKnownVideos();

    return () => {
      cancelled = true;
    };
  }, [primaryName]);

  const handleToggleVisibility = async (video: VideoMetadata) => {
    const nextVideo: VideoMetadata = {
      ...video,
      visibility: video.visibility === 'public' ? 'private' : 'public',
    };

    setUpdatingVisibilityId(video.identifier);
    setVisibilityError(null);
    setHelperActionMessage(null);

    try {
      await publishVideoMetadataResource(nextVideo);
      setKnownVideos((current) => ({
        ...current,
        [nextVideo.identifier]: nextVideo,
      }));
      setHelperActionMessage(
        nextVideo.visibility === 'public'
          ? 'Video is now marked public.'
          : 'Video is now private to your dashboard.'
      );
    } catch (caughtError) {
      setVisibilityError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update video visibility.'
      );
    } finally {
      setUpdatingVisibilityId(null);
    }
  };

  const handleSaveVideoEdits = async (nextVideo: VideoMetadata) => {
    await publishVideoMetadataResource(nextVideo);
    setKnownVideos((current) => ({
      ...current,
      [nextVideo.identifier]: nextVideo,
    }));
    setHelperActionMessage('Video details updated.');
  };

  const handleDeleteVideo = async (video: VideoMetadata) => {
    const confirmed = window.confirm(
      `Delete "${video.title}" from both VIDEO and JSON resources?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingVideoId(video.identifier);
    setVisibilityError(null);
    setHelperActionMessage(null);

    try {
      await deleteVideoResources(video);
      setDeletedVideoIds((current) => ({
        ...current,
        [video.identifier]: true,
      }));
      setKnownVideos((current) => {
        const next = { ...current };
        delete next[video.identifier];
        return next;
      });
      setHelperActionMessage('Video deleted from your dashboard.');
    } catch (caughtError) {
      setVisibilityError(
        caughtError instanceof Error ? caughtError.message : 'Failed to delete video.'
      );
    } finally {
      setDeletingVideoId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 5,
          color: 'var(--vb-text-main)',
          background:
            'radial-gradient(circle at top left, rgba(207, 73, 82, 0.2), transparent 34%), radial-gradient(circle at top right, rgba(47, 121, 200, 0.22), transparent 36%), linear-gradient(135deg, rgba(31, 38, 52, 0.96), rgba(18, 25, 38, 0.94))',
          boxShadow: 'var(--vb-card-glow)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 28%, transparent 70%, rgba(255,255,255,0.03))',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Typography variant="overline" sx={{ letterSpacing: '0.18em' }}>
              LOCAL CREATOR TOOL
            </Typography>

            <Typography variant="h3">Qortal Video Bridge</Typography>

            <Typography variant="body1" sx={{ maxWidth: 760, opacity: 0.88 }}>
              Import YouTube videos to QDN from your own computer. Paste a source URL,
              let your local helper transcode it to AV1 and Opus, then approve the
              Qortal publish flow.
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                label="YouTube URL"
                placeholder="https://www.youtube.com/watch?v=..."
                variant="filled"
                InputProps={{ disableUnderline: true }}
                sx={{
                  '& .MuiFilledInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                }}
              />

              <Button
                variant="contained"
                size="large"
                onClick={handleProcessVideo}
                disabled={!canPublish || isBusy || !health?.ok}
                startIcon={!isBusy ? <CloudUploadRoundedIcon /> : undefined}
                sx={{
                  px: 4,
                  borderRadius: 3,
                  minWidth: { xs: '100%', md: 240 },
                  background: 'linear-gradient(135deg, var(--vb-red), var(--vb-blue))',
                  color: 'white',
                  '&:hover': {
                    background:
                      'linear-gradient(135deg, rgba(207, 73, 82, 0.92), rgba(47, 121, 200, 0.92))',
                  },
                }}
              >
                {isBusy ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={18} color="inherit" />
                    <span>Working...</span>
                  </Stack>
                ) : (
                  'Process Video'
                )}
              </Button>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="transcode-preset-label">Transcode preset</InputLabel>
                <Select
                  labelId="transcode-preset-label"
                  value={transcodePreset}
                  label="Transcode preset"
                  onChange={(event) =>
                    setTranscodePreset(event.target.value as VideoTranscodePreset)
                  }
                >
                  {TRANSCODE_PRESET_OPTIONS.filter(
                    (option) =>
                      !health?.availablePresets ||
                      health.availablePresets.includes(option.key)
                  ).map((option) => (
                    <MenuItem key={option.key} value={option.key}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack
                justifyContent="center"
                sx={{
                  minWidth: { xs: '100%', md: 320 },
                  px: 2,
                  py: 1.5,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {presetSummary.label}
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.72)">
                  {presetSummary.description}
                </Typography>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Chip
                label={
                  primaryName
                    ? `Publishing as ${primaryName}`
                    : 'A registered Qortal name is required'
                }
                color={primaryName ? 'success' : 'warning'}
                sx={{ width: 'fit-content' }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic}
                    onChange={(event) => setIsPublic(event.target.checked)}
                    color="warning"
                  />
                }
                label={isPublic ? 'Public metadata' : 'Private to dashboard'}
                sx={{ ml: 0.5 }}
              />
            </Stack>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label="All videos"
                color={visibilityFilter === 'all' ? 'primary' : 'default'}
                onClick={() => setVisibilityFilter('all')}
              />
              <Chip
                label="Public only"
                color={visibilityFilter === 'public' ? 'info' : 'default'}
                onClick={() => setVisibilityFilter('public')}
              />
              <Chip
                label="Private only"
                color={visibilityFilter === 'private' ? 'warning' : 'default'}
                onClick={() => setVisibilityFilter('private')}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {job.message ? <Alert severity="info">{job.message}</Alert> : null}
      {job.error ? <Alert severity="error">{job.error}</Alert> : null}
      {duplicateWarning ? <Alert severity="warning">{duplicateWarning}</Alert> : null}
      {visibilityError ? <Alert severity="error">{visibilityError}</Alert> : null}
      {helperError ? <Alert severity="warning">{helperError}</Alert> : null}
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      {helperActionMessage ? <Alert severity="success">{helperActionMessage}</Alert> : null}

      {job.phase !== 'idle' ? (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={1}>
              <Typography variant="h6">Current job</Typography>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{job.phase}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Downloading, local AV1/Opus transcode, approval, and metadata publish
                are tracked here for the active creator job.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {lastPublishedVideo ? (
        <Alert severity="success">
          Latest submitted video: <strong>{lastPublishedVideo.title}</strong>
          {lastPublishedVideo.duration
            ? ` (${formatDuration(lastPublishedVideo.duration)})`
            : null}
        </Alert>
      ) : null}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5">Local helper</Typography>
              <Typography variant="body2" color="text.secondary">
                This q-app expects a helper on your own computer. Install `yt-dlp`
                and `ffmpeg`, keep the helper running, then use this dashboard as the
                creator UI.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Status: ${health?.ok ? 'Ready' : 'Offline'}`} />
              <Chip label={`Active jobs: ${health?.activeJobs ?? 0}`} color="primary" />
              <Chip label={`Queued jobs: ${health?.queuedJobs ?? 0}`} color="secondary" />
              <Chip label={`Prepared downloads: ${health?.preparedDownloads ?? 0}`} />
              <Chip
                label={`Duration limit: ${Math.floor((health?.maxVideoDurationSeconds ?? 0) / 60)} min`}
              />
            </Stack>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                color={health?.dependencies.ytDlp.available ? 'success' : 'error'}
                label={`yt-dlp: ${health?.dependencies.ytDlp.available ? 'Found' : 'Missing'}`}
              />
              <Chip
                color={health?.dependencies.ffmpeg.available ? 'success' : 'error'}
                label={`ffmpeg: ${health?.dependencies.ffmpeg.available ? 'Found' : 'Missing'}`}
              />
              {health?.defaultPreset ? (
                <Chip label={`Default preset: ${health.defaultPreset}`} variant="outlined" />
              ) : null}
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <Button onClick={() => void loadHealth()} disabled={isLoadingHealth}>
                {isLoadingHealth ? 'Refreshing...' : 'Refresh helper health'}
              </Button>

              <Button
                variant="outlined"
                color="warning"
                onClick={() => void handleCleanupHelper()}
                disabled={isRunningCleanup}
              >
                {isRunningCleanup ? 'Running cleanup...' : 'Cleanup prepared downloads'}
              </Button>
            </Stack>

            {!health?.ok ? (
              <Alert severity="warning">
                Local publishing is disabled until the helper, `yt-dlp`, and `ffmpeg`
                are all available on this computer.
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5">Your video library</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage uploads, preview published videos, and decide what appears on
                your creator dashboard.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Loaded: ${libraryVideos.length}`} />
              <Chip label={`Public: ${publicCount}`} color="info" />
              <Chip label={`Private: ${privateCount}`} color="warning" />
              <Chip label={`Pages: ${totalPages}`} />
              <Chip
                label={
                  visibilityFilter === 'all'
                    ? 'Showing all videos'
                    : visibilityFilter === 'public'
                      ? 'Showing only public videos'
                      : 'Showing only private videos'
                }
                variant="outlined"
              />
            </Stack>

            {!primaryName ? (
              <Typography color="text.secondary">
                Authenticate with a Qortal name to load your videos.
              </Typography>
            ) : visibleDashboardVideos.length === 0 ? (
              <Typography color="text.secondary">
                No published videos found yet. Import your first YouTube video to populate this library.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 18,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                }}
              >
                {visibleDashboardVideos
                  .slice(
                    (page - 1) * DASHBOARD_PAGE_SIZE,
                    (page - 1) * DASHBOARD_PAGE_SIZE + DASHBOARD_PAGE_SIZE
                  )
                  .map((video) => (
                    <DashboardListItem
                      key={video.identifier}
                      video={video}
                      onDelete={handleDeleteVideo}
                      onEdit={setEditingVideo}
                      onToggleVisibility={handleToggleVisibility}
                      deleteBusy={deletingVideoId === video.identifier}
                      visibilityBusy={updatingVisibilityId === video.identifier}
                    />
                  ))}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {visibleDashboardVideos.length > 0 ? (
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                Page {page} of {totalPages}. Showing {currentPageCount} video
                {currentPageCount === 1 ? '' : 's'} on this page.
              </Typography>

              <Pagination
                count={totalPages}
                page={page}
                onChange={(_event, value) => setPage(value)}
                color="primary"
                shape="rounded"
                siblingCount={1}
                boundaryCount={1}
              />
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <EditVideoDialog
        open={Boolean(editingVideo)}
        video={editingVideo}
        onClose={() => setEditingVideo(null)}
        onSave={handleSaveVideoEdits}
      />
    </Stack>
  );
};

export default Uploader;
