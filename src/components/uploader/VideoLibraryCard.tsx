import { Box, Card, CardContent, Typography } from '@mui/material';
import type { VideoMetadata } from '../../types/video';
import { VideoCard } from '../VideoCard';

interface VideoLibraryCardProps {
  deletingVideoId: string | null;
  editingVideo: (video: VideoMetadata) => void;
  isLoadingLibrary: boolean;
  onDelete: (video: VideoMetadata) => Promise<void>;
  primaryName?: string;
  videos: VideoMetadata[];
}

export const VideoLibraryCard = ({
  deletingVideoId,
  editingVideo,
  isLoadingLibrary,
  onDelete,
  primaryName,
  videos,
}: VideoLibraryCardProps) => (
  <Card sx={{ borderRadius: 4 }}>
    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
      <Box display="grid" gap={2}>
        <Typography variant="h5">Your video library</Typography>

        {!primaryName ? (
          <Typography color="text.secondary">
            Authenticate with a Qortal name to load your videos.
          </Typography>
        ) : isLoadingLibrary ? (
          <Typography color="text.secondary">Loading your published videos...</Typography>
        ) : videos.length === 0 ? (
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
            {videos.map((video) => (
              <VideoCard
                key={video.identifier}
                video={video}
                mode="dashboard"
                onDelete={onDelete}
                onEdit={editingVideo}
                deleteBusy={deletingVideoId === video.identifier}
              />
            ))}
          </Box>
        )}
      </Box>
    </CardContent>
  </Card>
);
