import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { ChangelogDialog } from './ChangelogDialog';
import { SupportProjectDialog } from './SupportProjectDialog';

export const AppFooter = () => {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);

  return (
    <>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, pb: 4 }}>
        <Card
          sx={{
            borderRadius: 4,
            background:
              'radial-gradient(circle at top left, rgba(207, 73, 82, 0.12), transparent 26%), radial-gradient(circle at top right, rgba(47, 121, 200, 0.14), transparent 30%), linear-gradient(180deg, rgba(22, 29, 41, 0.98), rgba(16, 22, 31, 0.98))',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                Since 2026
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  App v. 1.0
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.5 }}>
                  |
                </Typography>
                <Button variant="text" onClick={() => setChangelogOpen(true)}>
                  Changelog
                </Button>
              </Stack>

              <Button
                variant="contained"
                onClick={() => setSupportOpen(true)}
                className="vb-support-pulse"
                sx={{
                  background:
                    'linear-gradient(135deg, rgba(207, 73, 82, 0.92), rgba(47, 121, 200, 0.9))',
                }}
              >
                Support Project
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <ChangelogDialog open={changelogOpen} onClose={() => setChangelogOpen(false)} />
      <SupportProjectDialog
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        onSuccess={() => setThankYouOpen(true)}
      />

      <Snackbar
        open={thankYouOpen}
        autoHideDuration={3200}
        onClose={() => setThankYouOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setThankYouOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Thank you for supporting the project :)
        </Alert>
      </Snackbar>
    </>
  );
};
