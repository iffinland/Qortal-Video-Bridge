import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import type { HelperHealthResponse } from '../../types/helper';

interface LocalHelperCardProps {
  health: HelperHealthResponse | null;
  healthOk: boolean;
  isLoadingHealth: boolean;
  isRunningCleanup: boolean;
  onCleanup: () => void;
  onRefresh: () => void;
}

export const LocalHelperCard = ({
  health,
  healthOk,
  isLoadingHealth,
  isRunningCleanup,
  onCleanup,
  onRefresh,
}: LocalHelperCardProps) => (
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
          <Chip label={`Status: ${healthOk ? 'Ready' : 'Offline'}`} />
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
          <Button onClick={onRefresh} disabled={isLoadingHealth}>
            {isLoadingHealth ? 'Refreshing...' : 'Refresh helper health'}
          </Button>

          <Button
            variant="outlined"
            color="warning"
            onClick={onCleanup}
            disabled={isRunningCleanup}
          >
            {isRunningCleanup ? 'Running cleanup...' : 'Cleanup prepared downloads'}
          </Button>
        </Stack>

        {!healthOk ? (
          <Alert severity="warning">
            Local publishing is disabled until the helper, `yt-dlp`, and `ffmpeg`
            are all available on this computer.
          </Alert>
        ) : null}
      </Stack>
    </CardContent>
  </Card>
);
