import type { VideoTranscodePresetOption } from '../../types/video';

export const LIBRARY_PAGE_SIZE = 10;

export const TRANSCODE_PRESET_OPTIONS: VideoTranscodePresetOption[] = [
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
