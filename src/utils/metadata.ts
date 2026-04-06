import { objectToBase64 } from 'qapp-core';
import type { ListItem } from 'qapp-core';
import type { VideoMetadata } from '../types/video';

const MAX_METADATA_TITLE_LENGTH = 140;
const MAX_METADATA_DESCRIPTION_LENGTH = 280;

const normalizePublishText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

export const publishVideoMetadataResource = async (video: VideoMetadata) => {
  const base64 = await objectToBase64(video);
  const safeTitle =
    normalizePublishText(video.title, MAX_METADATA_TITLE_LENGTH) || video.identifier;
  const safeDescription =
    normalizePublishText(video.description, MAX_METADATA_DESCRIPTION_LENGTH) ||
    `Imported from ${video.sourceUrl}`;

  return qortalRequest({
    action: 'PUBLISH_QDN_RESOURCE',
    service: 'JSON',
    identifier: video.identifier,
    name: video.publisher.name,
    title: `${safeTitle} metadata`,
    description: `Metadata for ${safeDescription}`,
    filename: 'metadata.json',
    data64: base64,
  });
};

export const toUpdatedMetadataResource = (
  item: ListItem,
  video: VideoMetadata,
  response: {
    identifier: string;
    name: string;
    size: number;
    timestamp: number;
  }
) => ({
  qortalMetadata: {
    ...item.qortalMetadata,
    identifier: response.identifier,
    name: response.name,
    size: response.size,
    created: response.timestamp,
    metadata: {
      title: `${normalizePublishText(video.title, MAX_METADATA_TITLE_LENGTH) || video.identifier} metadata`,
      description: `Metadata for ${normalizePublishText(video.description, MAX_METADATA_DESCRIPTION_LENGTH) || `Imported from ${video.sourceUrl}`}`,
    },
  },
  data: video,
});

export const deleteVideoResources = async (video: VideoMetadata) => {
  return qortalRequest({
    action: 'DELETE_HOSTED_DATA',
    hostedData: [
      {
        service: 'VIDEO',
        identifier: video.qdn.identifier,
        name: video.qdn.name,
      },
      {
        service: 'JSON',
        identifier: video.identifier,
        name: video.publisher.name,
      },
    ],
  });
};
