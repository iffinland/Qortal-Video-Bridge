import { Card, CardContent, Pagination, Stack, Typography } from '@mui/material';

interface LibraryPaginationCardProps {
  currentPageCount: number;
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
}

export const LibraryPaginationCard = ({
  currentPageCount,
  page,
  setPage,
  totalPages,
}: LibraryPaginationCardProps) => (
  <Card sx={{ borderRadius: 4 }}>
    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" color="text.secondary">
          Page {page} of {totalPages}. Showing {currentPageCount} video
          {currentPageCount === 1 ? '' : 's'} on this page.
        </Typography>

        <Pagination
          count={totalPages}
          page={page}
          onChange={(_event, value) => setPage(value)}
          color="primary"
          shape="rounded"
          siblingCount={1}
          boundaryCount={1}
        />
      </Stack>
    </CardContent>
  </Card>
);
