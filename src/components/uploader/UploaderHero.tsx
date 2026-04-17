import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { VideoTranscodePreset, VideoTranscodePresetOption } from '../../types/video';
import { TRANSCODE_PRESET_OPTIONS } from './constants';

const uploaderHeroCardSx = {
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
} as const;

interface UploaderHeroProps {
  availablePresets?: VideoTranscodePreset[];
  canPublish: boolean;
  healthOk: boolean;
  isBusy: boolean;
  onProcessVideo: () => void;
  presetSummary: VideoTranscodePresetOption;
  setTranscodePreset: (preset: VideoTranscodePreset) => void;
  setUrl: (value: string) => void;
  transcodePreset: VideoTranscodePreset;
  url: string;
}

export const UploaderHero = ({
  availablePresets,
  canPublish,
  healthOk,
  isBusy,
  onProcessVideo,
  presetSummary,
  setTranscodePreset,
  setUrl,
  transcodePreset,
  url,
}: UploaderHeroProps) => (
  <Card sx={uploaderHeroCardSx}>
    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
      <Stack spacing={2.5}>
        <Typography variant="overline" sx={{ letterSpacing: '0.18em' }}>
          LOCAL CREATOR TOOL
        </Typography>

        <Typography variant="h3">Qortal Video Bridge</Typography>

        <Typography variant="body1" sx={{ maxWidth: 760, opacity: 0.88 }}>
          Import YouTube videos to QDN from your own NODE. Paste a source URL,
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
            onClick={onProcessVideo}
            disabled={!canPublish || isBusy || !healthOk}
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
                (option) => !availablePresets || availablePresets.includes(option.key)
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
      </Stack>
    </CardContent>
  </Card>
);
