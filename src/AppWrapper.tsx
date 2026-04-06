import { GlobalProvider } from 'qapp-core';
import { Outlet } from 'react-router-dom';
import { publicSalt } from './qapp-config';

export const AppWrapper = () => {
  return (
    <GlobalProvider
      config={{
        appName: 'VideoBox-Bridge', // change to your own
        auth: {
          balanceSetting: {
            interval: 180000,
            onlyOnMount: false,
          },
          authenticateOnMount: true,
        },
        publicSalt: publicSalt,
      }}
    >
      <Outlet />
    </GlobalProvider>
  );
};
