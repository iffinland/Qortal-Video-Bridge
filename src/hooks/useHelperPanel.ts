import { useState } from 'react';
import { useHelperMonitor } from './useHelperMonitor';

export const useHelperPanel = () => {
  const [helperSuccessMessage, setHelperSuccessMessage] = useState<string | null>(null);
  const {
    actionError,
    cleanupHelper,
    error,
    health,
    isLoadingHealth,
    isRunningCleanup,
    loadHealth,
  } = useHelperMonitor();

  const runCleanup = async () => {
    try {
      const result = await cleanupHelper();
      setHelperSuccessMessage(
        `Local helper cleanup finished. Removed ${result.clearedPreparedDownloads} prepared download(s).`
      );
    } catch {
      return;
    }
  };

  return {
    actionError,
    health,
    helperError: error,
    helperSuccessMessage,
    isLoadingHealth,
    isRunningCleanup,
    refreshHealth: loadHealth,
    runCleanup,
    setHelperSuccessMessage,
  };
};
