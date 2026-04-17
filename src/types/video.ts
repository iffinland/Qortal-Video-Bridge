export interface VideoMetadata {
  videoId: string;
  sourceUrl: string;
  title: string;
  description: string;
  duration: number | null;
  identifier: string;
  thumbnailUrl?: string;
  channelName?: string;
  originalPublishDate?: string;
  stats?: {
    likes: number;
    shares: number;
    tips: number;
  };
  publisher: {
    name: string;
    address: string;
    publicKey: string;
  };
  qdn: {
    service: 'VIDEO';
    name: string;
    identifier: string;
  };
  createdAt: string;
  localFilename?: string;
  transcodePreset?: VideoTranscodePreset;
}

export type VideoTranscodePreset = 'small' | 'balanced' | 'high-quality';

export interface DownloadVideoRequest {
  url: string;
  name: string;
  address: string;
  publicKey: string;
  identifier?: string;
  transcodePreset?: VideoTranscodePreset;
}

export interface DownloadVideoResponse {
  success: boolean;
  message: string;
  identifier: string;
  downloadId?: string;
  downloadUrl?: string;
  qdnUrl?: string;
  publishResponse?: unknown;
  videoMetadata: VideoMetadata;
}

export interface PublishJobState {
  phase:
    | 'idle'
    | 'downloading'
    | 'preparing-upload'
    | 'waiting-for-approval'
    | 'publishing-metadata'
    | 'success'
    | 'error';
  message: string | null;
  error: string | null;
}

export interface VideoTranscodePresetOption {
  key: VideoTranscodePreset;
  label: string;
  description: string;
}

export const VIDEO_IDENTIFIER_PREFIX = 'qvb';
export const VIDEO_ENTITY_TYPE = 'youtube-video';
export const PUBLISHED_VIDEO_LIST_NAME = 'published-youtube-videos';

const sanitizeIdentifierPart = (value: string) =>
  value
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const extractYouTubeId = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtu.be')) {
      return sanitizeIdentifierPart(parsedUrl.pathname.slice(1));
    }

    return sanitizeIdentifierPart(parsedUrl.searchParams.get('v') || '');
  } catch {
    return '';
  }
};

export const buildIdentifier = (url: string, title?: string) => {
  const videoId = extractYouTubeId(url);
  const fallback = sanitizeIdentifierPart(title || url) || 'video';

  return `${VIDEO_IDENTIFIER_PREFIX}-${videoId || fallback}-${Date.now()}`;
};
