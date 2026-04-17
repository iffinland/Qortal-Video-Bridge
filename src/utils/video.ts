import type { VideoMetadata } from '../types/video';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildQdnVideoPath = (
  video: Pick<VideoMetadata, 'qdn' | 'publisher'>
) =>
  `/arbitrary/${encodeURIComponent(video.qdn.service)}/${encodeURIComponent(video.publisher.name)}/${encodeURIComponent(video.qdn.identifier)}`;

export const formatVideoDate = (value?: string) => {
  if (!value) return 'Unknown date';

  const normalizedValue =
    /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export const buildEmbedCode = (
  video: Pick<
    VideoMetadata,
    | 'qdn'
    | 'publisher'
    | 'title'
    | 'description'
    | 'thumbnailUrl'
    | 'localFilename'
    | 'sourceUrl'
  >
) => {
  const qdnPath = buildQdnVideoPath(video);
  const safeTitle = escapeHtml(video.title);
  const safeDescription = video.description.trim()
    ? escapeHtml(video.description)
    : '';
  const safePoster = video.thumbnailUrl ? escapeHtml(video.thumbnailUrl) : '';
  const safeSourceUrl = video.sourceUrl.trim() ? escapeHtml(video.sourceUrl) : '';
  const downloadName = (video.localFilename || `${video.qdn.identifier}.mp4`).replace(
    /"/g,
    '&quot;'
  );

  return `<figure class="q-video-embed">
  <figcaption style="font-family: Arial, sans-serif; font-size: 18px; color: #2c3e50; font-weight: bold; margin-bottom: 10px;">${safeTitle}</figcaption>
  <video controls preload="metadata" src="${qdnPath}"${safePoster ? ` poster="${safePoster}"` : ''} style="width: 100%; max-width: 960px; border-radius: 8px; background: #000;"></video>
  ${safeDescription ? `<p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #4b5563; margin: 10px 0 0;">${safeDescription}</p>` : ''}
  <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 12px;">
    <a href="${qdnPath}" download="${downloadName}" style="text-decoration: none; color: #555; font-size: 0.9em; font-family: Arial, sans-serif;">Download video</a>
    ${safeSourceUrl ? `<a href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: #555; font-size: 0.9em; font-family: Arial, sans-serif;">Original source</a>` : ''}
  </div>
</figure>`;
};

const buildUseEmbedLink = (
  video: Pick<VideoMetadata, 'qdn' | 'publisher' | 'localFilename'>,
  includeFilename: boolean
) => {
  const searchParams = new URLSearchParams({
    name: video.publisher.name,
    identifier: video.qdn.identifier,
    service: video.qdn.service,
  });

  if (includeFilename) {
    searchParams.set('mimeType', 'video/mp4');
    searchParams.set('fileName', video.localFilename || `${video.qdn.identifier}.mp4`);
  }

  return `qortal://use-embed/VIDEO?${searchParams.toString()}`;
};

export const buildShareUrl = (
  video: Pick<VideoMetadata, 'qdn' | 'publisher' | 'localFilename'>
) => buildUseEmbedLink(video, false);

export const buildChatLink = (
  video: Pick<VideoMetadata, 'qdn' | 'publisher' | 'localFilename'>
) => buildUseEmbedLink(video, true);
