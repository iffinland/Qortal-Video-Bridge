import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { getHelperUrl } from '../config/helper';
import type {
  HelperCleanupResponse,
  HelperHealthResponse,
} from '../types/helper';

const HELPER_URL = getHelperUrl();
const helperHealthUrl = `${HELPER_URL}/health`;

const normalizeHelperMonitorError = (caughtError: unknown, fallbackMessage: string) => {
  if (axios.isAxiosError(caughtError)) {
    if (caughtError.code === 'ECONNABORTED') {
      return 'The helper health request timed out.';
    }

    if (caughtError.message === 'Network Error') {
      return `Could not reach the local helper at ${helperHealthUrl}. Make sure the helper is running on this computer.`;
    }

    return caughtError.response?.data?.message || caughtError.message || fallbackMessage;
  }

  return fallbackMessage;
};

export const useHelperMonitor = () => {
  const [health, setHealth] = useState<HelperHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  const loadHealth = useCallback(async () => {
    setIsLoadingHealth(true);
    setError(null);

    try {
      const response = await axios.get<HelperHealthResponse>(`${HELPER_URL}/health`);
      setHealth(response.data);
    } catch (caughtError) {
      setError(normalizeHelperMonitorError(caughtError, 'Unable to load helper health.'));
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  const cleanupHelper = useCallback(async () => {
    setIsRunningCleanup(true);
    setActionError(null);

    try {
      const response = await axios.post<HelperCleanupResponse>(`${HELPER_URL}/cleanup`);
      await loadHealth();
      return response.data;
    } catch (caughtError) {
      const message = normalizeHelperMonitorError(
        caughtError,
        'Unable to run helper cleanup.'
      );
      setActionError(message);
      throw new Error(message);
    } finally {
      setIsRunningCleanup(false);
    }
  }, [loadHealth]);

  useEffect(() => {
    void loadHealth();

    const interval = window.setInterval(() => {
      void loadHealth();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadHealth]);

  return {
    actionError,
    cleanupHelper,
    error,
    health,
    isLoadingHealth,
    isRunningCleanup,
    loadHealth,
  };
};
