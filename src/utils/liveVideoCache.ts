import type { VideoMetadata } from '../types/video';

const STORAGE_KEY = 'videobox-live-videos';
const EVENT_NAME = 'videobox-live-videos-updated';

const isBrowser = () => typeof window !== 'undefined';

const readCache = (): VideoMetadata[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as VideoMetadata[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCache = (videos: VideoMetadata[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(videos.slice(0, 50)));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const getLiveVideos = () => readCache();

export const upsertLiveVideo = (video: VideoMetadata) => {
  const current = readCache();
  const filtered = current.filter(
    (item) =>
      !(
        item.identifier === video.identifier && item.publisher.name === video.publisher.name
      )
  );

  filtered.unshift(video);
  writeCache(filtered);
};

export const removeLiveVideo = (video: Pick<VideoMetadata, 'identifier' | 'publisher'>) => {
  const current = readCache();
  const filtered = current.filter(
    (item) =>
      !(
        item.identifier === video.identifier &&
        item.publisher.name === video.publisher.name
      )
  );
  writeCache(filtered);
};

export const subscribeToLiveVideos = (callback: () => void) => {
  if (!isBrowser()) {
    return () => undefined;
  }

  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener('storage', callback);

  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener('storage', callback);
  };
};
