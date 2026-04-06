import type { VideoMetadata } from '../types/video';
import { VIDEO_IDENTIFIER_PREFIX } from '../types/video';

export interface SearchResourceResult {
  identifier: string;
  name: string;
  service: 'JSON' | 'VIDEO';
  created?: number;
  updated?: number;
  size?: number;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface VideoLibraryDebugInfo {
  metadataResourceCount: number;
  videoResourceCount: number;
  metadataVideoCount: number;
  metadataPagesFetched: number;
  videoPagesFetched: number;
  metadataResourceIdentifiers: string[];
  videoResourceIdentifiers: string[];
  finalVideoIdentifiers: string[];
}

const isManagedVideo = (video: VideoMetadata) =>
  video.identifier.startsWith(`${VIDEO_IDENTIFIER_PREFIX}-`);

const parseFetchedVideo = (value: unknown): VideoMetadata | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return parseFetchedVideo(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (record.data) {
    return parseFetchedVideo(record.data);
  }

  if (record.videoMetadata) {
    return parseFetchedVideo(record.videoMetadata);
  }

  return record as unknown as VideoMetadata;
};

const normalizeFetchedVideo = (
  resource: SearchResourceResult,
  video: VideoMetadata
): VideoMetadata | null => {
  if (!video || !video.qdn || typeof video.qdn !== 'object') {
    return null;
  }

  const qdnIdentifier =
    typeof video.qdn.identifier === 'string' && video.qdn.identifier.trim()
      ? video.qdn.identifier
      : resource.identifier;
  const publisherName =
    typeof video.publisher?.name === 'string' && video.publisher.name.trim()
      ? video.publisher.name
      : resource.name;

  return {
    ...video,
    identifier: resource.identifier,
    publisher: {
      ...video.publisher,
      address: video.publisher?.address || '',
      publicKey: video.publisher?.publicKey || '',
      name: publisherName,
    },
    qdn: {
      service: 'VIDEO',
      name:
        typeof video.qdn.name === 'string' && video.qdn.name.trim()
          ? video.qdn.name
          : publisherName,
      identifier: qdnIdentifier,
    },
  };
};

const buildFallbackVideo = (resource: SearchResourceResult): VideoMetadata => {
  const resourceTimestamp = resource.created || resource.updated || Date.now();
  const fallbackTitle =
    resource.metadata?.title?.trim() || `Published video ${resource.identifier}`;
  const fallbackDescription =
    resource.metadata?.description?.trim() ||
    'Recovered from your published VIDEO resource because JSON metadata was unavailable.';

  return {
    videoId: resource.identifier,
    sourceUrl: '',
    title: fallbackTitle,
    description: fallbackDescription,
    duration: null,
    identifier: resource.identifier,
    visibility: 'public',
    publisher: {
      name: resource.name,
      address: '',
      publicKey: '',
    },
    qdn: {
      service: 'VIDEO',
      name: resource.name,
      identifier: resource.identifier,
    },
    createdAt: new Date(resourceTimestamp).toISOString(),
    localFilename: `${resource.identifier}.mp4`,
  };
};

const SEARCH_BATCH_SIZE = 100;

const uniqueResources = (items: SearchResourceResult[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.service}:${item.name}:${item.identifier}`;
    if (!item.identifier || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const searchAllResourcesByPrefix = async (
  service: 'JSON' | 'VIDEO'
): Promise<{ items: SearchResourceResult[]; pagesFetched: number }> => {
  const collected: SearchResourceResult[] = [];
  let offset = 0;
  let pagesFetched = 0;

  while (true) {
    const page = (await qortalRequest({
      action: 'SEARCH_QDN_RESOURCES',
      service,
      identifier: `${VIDEO_IDENTIFIER_PREFIX}-`,
      prefix: true,
      mode: 'ALL',
      reverse: true,
      includeMetadata: true,
      limit: SEARCH_BATCH_SIZE,
      offset,
      query: VIDEO_IDENTIFIER_PREFIX,
    })) as SearchResourceResult[];

    const normalizedPage = Array.isArray(page) ? page : [];
    pagesFetched += 1;

    if (!normalizedPage.length) {
      break;
    }

    collected.push(...normalizedPage);

    if (normalizedPage.length < SEARCH_BATCH_SIZE) {
      break;
    }

    offset += SEARCH_BATCH_SIZE;
  }

  return {
    items: uniqueResources(collected),
    pagesFetched,
  };
};

export const loadPublishedVideos = async (
  _primaryName?: string
): Promise<{
  debug: VideoLibraryDebugInfo;
  videos: Record<string, VideoMetadata>;
}> => {
  const metadataSearch = await searchAllResourcesByPrefix('JSON');
  const videoSearch = await searchAllResourcesByPrefix('VIDEO');

  const managedMetadataResources = metadataSearch.items.filter((resource) =>
    resource.identifier.startsWith(`${VIDEO_IDENTIFIER_PREFIX}-`)
  );
  const managedVideoResources = videoSearch.items.filter((resource) =>
    resource.identifier.startsWith(`${VIDEO_IDENTIFIER_PREFIX}-`)
  );

  const fetchedVideos = await Promise.allSettled(
    managedMetadataResources.map(async (resource) => {
      const response = await qortalRequest({
        action: 'FETCH_QDN_RESOURCE',
        service: 'JSON',
        name: resource.name,
        identifier: resource.identifier,
      });

      return normalizeFetchedVideo(resource, parseFetchedVideo(response) as VideoMetadata);
    })
  );

  const metadataVideoMap = fetchedVideos.reduce<Record<string, VideoMetadata>>(
    (accumulator, video) => {
      if (video.status !== 'fulfilled' || !video.value || !isManagedVideo(video.value)) {
        return accumulator;
      }

      const current = accumulator[video.value.identifier];

      if (
        !current ||
        new Date(video.value.createdAt).getTime() > new Date(current.createdAt).getTime()
      ) {
        accumulator[video.value.identifier] = video.value;
      }

      return accumulator;
    },
    {}
  );

  const videos = managedVideoResources.reduce<Record<string, VideoMetadata>>(
    (accumulator, resource) => {
      const metadataVideo = metadataVideoMap[resource.identifier];
      const nextVideo = metadataVideo
        ? {
            ...metadataVideo,
            qdn: {
              service: 'VIDEO' as const,
              name: resource.name,
              identifier: resource.identifier,
            },
          }
        : buildFallbackVideo(resource);

      accumulator[resource.identifier] = nextVideo;
      return accumulator;
    },
    {}
  );

  Object.values(metadataVideoMap).forEach((video) => {
    if (!videos[video.identifier]) {
      videos[video.identifier] = video;
    }
  });

  return {
    debug: {
      metadataResourceCount: managedMetadataResources.length,
      videoResourceCount: managedVideoResources.length,
      metadataVideoCount: Object.keys(metadataVideoMap).length,
      metadataPagesFetched: metadataSearch.pagesFetched,
      videoPagesFetched: videoSearch.pagesFetched,
      metadataResourceIdentifiers: managedMetadataResources.map((resource) => resource.identifier),
      videoResourceIdentifiers: managedVideoResources.map((resource) => resource.identifier),
      finalVideoIdentifiers: Object.keys(videos),
    },
    videos,
  };
};
