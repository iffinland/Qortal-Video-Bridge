import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { formatDuration, useResourceStatus } from 'qapp-core';
import { useState } from 'react';
import type { VideoMetadata } from '../types/video';
import {
  buildChatLink,
  buildEmbedCode,
  buildShareUrl,
  formatVideoDate,
} from '../utils/video';
import { VideoPlayerModal } from './VideoPlayerModal';

interface VideoCardProps {
  mode?: 'feed' | 'dashboard';
  onDelete?: (video: VideoMetadata) => Promise<void> | void;
  onEdit?: (video: VideoMetadata) => void;
  onToggleVisibility?: (video: VideoMetadata) => Promise<void> | void;
  deleteBusy?: boolean;
  visibilityBusy?: boolean;
  video: VideoMetadata;
}

const truncateDescription = (value: string, maxLength = 200) => {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

const canUseThumbnail = (value?: string) => {
  if (!value) {
    return false;
  }

  if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
};

export const VideoCard = ({
  mode = 'feed',
  onDelete,
  onEdit,
  onToggleVisibility,
  deleteBusy = false,
  video,
  visibilityBusy = false,
}: VideoCardProps) => {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);
  const { isReady, percentLoaded, status } = useResourceStatus({
    resource: video.qdn,
  });
  const shareUrl = buildShareUrl(video);
  const embedCode = buildEmbedCode(video);
  const chatLink = buildChatLink(video);
  const thumbnailUrl = canUseThumbnail(video.thumbnailUrl) ? video.thumbnailUrl : undefined;

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback({
        message: 'Share link copied.',
        severity: 'success',
      });
    } catch (caughtError) {
      setFeedback({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Could not copy share link.',
        severity: 'error',
      });
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setFeedback({
        message: 'Embed code copied.',
        severity: 'success',
      });
    } catch (caughtError) {
      setFeedback({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Could not copy embed code.',
        severity: 'error',
      });
    }
  };

  const handleCopyChatLink = async () => {
    try {
      await navigator.clipboard.writeText(chatLink);
      setFeedback({
        message: 'CHAT link copied.',
        severity: 'success',
      });
    } catch (caughtError) {
      setFeedback({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Could not copy CHAT link.',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          borderRadius: 4,
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(28, 35, 46, 0.92), rgba(18, 24, 34, 0.92))',
          borderColor: 'var(--vb-border)',
          boxShadow: '0 16px 38px rgba(4, 10, 22, 0.18)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.04), transparent 28%, transparent 72%, rgba(255,255,255,0.02))',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '16 / 9',
            backgroundColor: '#08101d',
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setPlayerOpen(true)}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background:
                'linear-gradient(180deg, rgba(16, 22, 32, 0.18), rgba(10, 16, 24, 0.78))',
            }}
          >
            <IconButton
              sx={{
                width: 72,
                height: 72,
                color: 'common.white',
                background:
                  'linear-gradient(135deg, rgba(207, 73, 82, 0.58), rgba(47, 121, 200, 0.48))',
              }}
            >
              <PlayCircleOutlineRoundedIcon sx={{ fontSize: 42 }} />
            </IconButton>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}
          >
            <Chip
              size="small"
              color={isReady ? 'success' : 'default'}
              label={isReady ? 'Ready' : `${Math.round(percentLoaded)}%`}
            />
            {video.duration ? (
              <Chip size="small" label={formatDuration(video.duration)} />
            ) : null}
            {mode === 'dashboard' ? (
              <Chip
                size="small"
                color={video.visibility === 'public' ? 'info' : 'warning'}
                label={video.visibility === 'public' ? 'Public' : 'Private'}
              />
            ) : null}
          </Stack>
        </Box>

        <CardContent sx={{ p: 2.25 }}>
          <Stack spacing={1.25}>
            <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
              {video.title}
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={video.publisher.name} />
              {video.channelName ? <Chip size="small" label={video.channelName} /> : null}
              <Chip size="small" label={formatVideoDate(video.createdAt)} />
              {video.originalPublishDate ? (
                <Chip size="small" label={`YouTube: ${formatVideoDate(video.originalPublishDate)}`} />
              ) : null}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              {video.description
                ? truncateDescription(video.description)
                : 'No description provided.'}
            </Typography>

            {!isReady ? (
              <Alert severity={status === 'FAILED_TO_DOWNLOAD' ? 'warning' : 'info'}>
                {status === 'FAILED_TO_DOWNLOAD'
                  ? 'This node has not downloaded the video yet.'
                  : 'Video is syncing from QDN.'}
              </Alert>
            ) : null}

            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              useFlexGap
              flexWrap="wrap"
              sx={{
                mt: 0.5,
                pt: 1.25,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Button
                size="small"
                onClick={handleCopyShare}
                startIcon={<IosShareRoundedIcon />}
              >
                Share Link
              </Button>

              <Button
                size="small"
                onClick={handleCopyEmbed}
                startIcon={<LaunchRoundedIcon />}
              >
                Embed Code
              </Button>

              <Button size="small" onClick={handleCopyChatLink}>
                Post to CHAT
              </Button>

              {mode === 'dashboard' && onToggleVisibility ? (
                <Button
                  size="small"
                  onClick={() => onToggleVisibility(video)}
                  disabled={visibilityBusy}
                >
                  {visibilityBusy
                    ? 'Saving...'
                    : video.visibility === 'public'
                      ? 'Make Private'
                      : 'Publish Publicly'}
                </Button>
              ) : null}

              {mode === 'dashboard' && onEdit ? (
                <Button size="small" onClick={() => onEdit(video)}>
                  Edit
                </Button>
              ) : null}

              {mode === 'dashboard' && onDelete ? (
                <Button
                  size="small"
                  color="error"
                  onClick={() => onDelete(video)}
                  disabled={deleteBusy}
                >
                  {deleteBusy ? 'Deleting...' : 'Delete'}
                </Button>
              ) : null}
            </Stack>

          </Stack>
        </CardContent>
      </Card>

      <VideoPlayerModal open={playerOpen} onClose={() => setPlayerOpen(false)} video={video} />
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={2600}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setFeedback(null)}
          severity={feedback?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>
    </>
  );
};
