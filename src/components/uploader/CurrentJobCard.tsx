import { Card, CardContent, Stack, Typography } from '@mui/material';

interface CurrentJobCardProps {
  jobPhase: string;
}

export const CurrentJobCard = ({ jobPhase }: CurrentJobCardProps) => (
  <Card sx={{ borderRadius: 4 }}>
    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
      <Stack spacing={1}>
        <Typography variant="h6">Current job</Typography>
        <Typography variant="body2" color="text.secondary">
          Status: <strong>{jobPhase}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Downloading, local AV1/Opus transcode, approval, and metadata publish
          are tracked here for the active creator job.
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);
