const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const defaultHelperUrl = 'http://127.0.0.1:3001';

export const getHelperUrl = () => {
  const configuredUrl = import.meta.env.VITE_VIDEO_HELPER_URL?.trim();

  if (!configuredUrl) {
    return defaultHelperUrl;
  }

  return trimTrailingSlash(configuredUrl);
};
