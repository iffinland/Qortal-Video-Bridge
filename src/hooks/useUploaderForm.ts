import { useEffect, useMemo, useState } from 'react';
import type {
  DownloadVideoResponse,
  VideoMetadata,
  VideoTranscodePreset,
  VideoTranscodePresetOption,
} from '../types/video';

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

interface UseUploaderFormParams {
  defaultPreset?: VideoTranscodePreset;
  knownVideos: VideoMetadata[];
  onVideoPublished: (video: VideoMetadata) => void;
  presetOptions: VideoTranscodePresetOption[];
  publishVideo: (
    url: string,
    transcodePreset?: VideoTranscodePreset
  ) => Promise<(DownloadVideoResponse & { videoMetadata: VideoMetadata }) | null>;
}

export const useUploaderForm = ({
  defaultPreset,
  knownVideos,
  onVideoPublished,
  presetOptions,
  publishVideo,
}: UseUploaderFormParams) => {
  const [url, setUrl] = useState('');
  const [transcodePreset, setTranscodePreset] =
    useState<VideoTranscodePreset>('balanced');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const presetSummary =
    useMemo(
      () =>
        presetOptions.find((option) => option.key === transcodePreset) ||
        presetOptions[1],
      [presetOptions, transcodePreset]
    ) || presetOptions[0];

  useEffect(() => {
    if (defaultPreset) {
      setTranscodePreset(defaultPreset);
    }
  }, [defaultPreset]);

  const handleProcessVideo = async () => {
    const trimmedUrl = url.trim();
    const nextFingerprint = extractVideoFingerprint(trimmedUrl);
    const duplicate = knownVideos.find(
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
    const result = await publishVideo(url, transcodePreset);

    if (result?.success) {
      setUrl('');
      onVideoPublished(result.videoMetadata);
    }
  };

  return {
    duplicateWarning,
    handleProcessVideo,
    presetSummary,
    setTranscodePreset,
    setUrl,
    transcodePreset,
    url,
  };
};
