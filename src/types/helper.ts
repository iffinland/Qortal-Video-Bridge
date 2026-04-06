import type { VideoTranscodePreset } from './video.js';

export interface HelperDependencyStatus {
  available: boolean;
  binary: string;
  error?: string;
}

export interface HelperHealthResponse {
  ok: boolean;
  port: number;
  preparedDownloads: number;
  activeJobs: number;
  queuedJobs: number;
  mode: 'local';
  maxVideoDurationSeconds: number;
  helperUrl: string;
  defaultPreset: VideoTranscodePreset;
  availablePresets: VideoTranscodePreset[];
  dependencies: {
    ytDlp: HelperDependencyStatus;
    ffmpeg: HelperDependencyStatus;
  };
}

export interface HelperCleanupResponse {
  success: boolean;
  clearedPreparedDownloads: number;
}
