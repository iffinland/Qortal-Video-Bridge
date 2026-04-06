import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { useIframe } from '../hooks/useIframeListener';

const Layout = () => {
  useIframe();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, var(--vb-red-soft), transparent 30%), radial-gradient(circle at top right, var(--vb-blue-soft), transparent 34%), linear-gradient(180deg, #2a3749 0%, #223043 52%, #1b2636 100%)',
      }}
    >
      <Box component="main" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <Outlet />
      </Box>

      <AppFooter />
    </Box>
  );
};

export default Layout;
