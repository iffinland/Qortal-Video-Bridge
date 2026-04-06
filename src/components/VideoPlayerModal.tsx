import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useResourceStatus } from 'qapp-core';
import type { VideoMetadata } from '../types/video';

interface VideoPlayerModalProps {
  onClose: () => void;
  open: boolean;
  video: VideoMetadata | null;
}

export const VideoPlayerModal = ({
  onClose,
  open,
  video,
}: VideoPlayerModalProps) => {
  const { isReady, resourceUrl } = useResourceStatus({
    resource: video?.qdn || null,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 4,
          background:
            'radial-gradient(circle at top left, rgba(207, 73, 82, 0.12), transparent 30%), radial-gradient(circle at top right, rgba(47, 121, 200, 0.16), transparent 34%), linear-gradient(180deg, rgba(18, 24, 35, 0.98), rgba(12, 18, 28, 0.98))',
          color: 'common.white',
          border: '1px solid var(--vb-border)',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h5">{video?.title}</Typography>
              {video?.channelName ? (
                <Typography variant="body2" color="rgba(255,255,255,0.7)">
                  {video.channelName}
                </Typography>
              ) : null}
            </Box>

            <IconButton onClick={onClose} sx={{ color: 'common.white' }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          {isReady && resourceUrl ? (
            <Box
              component="video"
              controls
              preload="metadata"
              src={resourceUrl}
              sx={{
                width: '100%',
                maxHeight: '70vh',
                borderRadius: 3,
                backgroundColor: 'black',
              }}
            />
          ) : (
            <Box
              sx={{
                borderRadius: 3,
                minHeight: 320,
                display: 'grid',
                placeItems: 'center',
                background:
                  'linear-gradient(135deg, rgba(33, 43, 61, 0.94), rgba(18, 25, 38, 0.98))',
              }}
            >
              <Typography color="rgba(255,255,255,0.7)">
                Video is syncing from QDN.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
