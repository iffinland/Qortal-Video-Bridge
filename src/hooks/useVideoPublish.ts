import axios from 'axios';
import { objectToBase64, useAuth } from 'qapp-core';
import { useMemo, useState } from 'react';
import { getHelperUrl } from '../config/helper';
import type {
  DownloadVideoRequest,
  DownloadVideoResponse,
  PublishJobState,
  VideoMetadata,
  VideoTranscodePreset,
} from '../types/video';
import {
  buildIdentifier,
} from '../types/video';

const HELPER_URL = getHelperUrl();

const defaultJobState: PublishJobState = {
  phase: 'idle',
  message: null,
  error: null,
};

const helperHealthUrl = `${HELPER_URL}/health`;
const MAX_VIDEO_PUBLISH_TITLE_LENGTH = 140;
const MAX_VIDEO_PUBLISH_DESCRIPTION_LENGTH = 280;

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

const toVideoPublishPayload = (videoMetadata: VideoMetadata) => {
  const safeTitle =
    normalizePublishText(videoMetadata.title, MAX_VIDEO_PUBLISH_TITLE_LENGTH) ||
    videoMetadata.identifier;
  const safeDescription =
    normalizePublishText(
      videoMetadata.description,
      MAX_VIDEO_PUBLISH_DESCRIPTION_LENGTH
    ) || `Imported from ${videoMetadata.sourceUrl}`;

  return {
    title: safeTitle,
    description: safeDescription,
  };
};

const normalizePublishError = (caughtError: unknown) => {
  if (axios.isAxiosError(caughtError)) {
    const status = caughtError.response?.status;
    const helperMessage = caughtError.response?.data?.message;

    if (status === 400) {
      return helperMessage || 'The video request was rejected by the helper.';
    }

    if (status === 401) {
      return 'Authentication is required before publishing.';
    }

    if (status === 429) {
      return helperMessage || 'The helper is busy right now. Please retry shortly.';
    }

    if (status === 503) {
      return helperMessage || 'The helper is temporarily unavailable.';
    }

    if (status === 502 || status === 504) {
      return (
        helperMessage ||
        'The local helper timed out while processing the video. Please retry in a moment.'
      );
    }

    if (caughtError.code === 'ECONNABORTED') {
      return 'The local helper took too long to respond. Large local transcodes may need a longer timeout.';
    }

    if (caughtError.message === 'Network Error') {
      return `Could not reach the local helper service at ${HELPER_URL}. Make sure the helper is running on this computer and that ${helperHealthUrl} responds.`;
    }

    return helperMessage || caughtError.message || 'Failed to process the video.';
  }

  return caughtError instanceof Error
    ? caughtError.message
    : 'Failed to process the video.';
};

export const useVideoPublish = () => {
  const { address, publicKey, primaryName } = useAuth();
  const [job, setJob] = useState<PublishJobState>(defaultJobState);
  const [lastPublishedVideo, setLastPublishedVideo] =
    useState<VideoMetadata | null>(null);

  const canPublish = useMemo(
    () => Boolean(address && publicKey && primaryName),
    [address, primaryName, publicKey]
  );

  const publishMetadataResource = async (videoMetadata: VideoMetadata) => {
    const base64 = await objectToBase64(videoMetadata);
    const { title, description } = toVideoPublishPayload(videoMetadata);

    await qortalRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      service: 'JSON',
      identifier: videoMetadata.identifier,
      name: videoMetadata.publisher.name,
      title: `${title} metadata`,
      description: `Metadata for ${description}`,
      filename: 'metadata.json',
      data64: base64,
    });
  };

  const publishVideoFile = async (
    videoMetadata: VideoMetadata,
    downloadUrl: string,
    filename: string
  ) => {
    const { title, description } = toVideoPublishPayload(videoMetadata);

    try {
      const fileResponse = await fetch(downloadUrl);

      if (!fileResponse.ok) {
        throw new Error(
          'Unable to fetch the prepared video file from the local helper.'
        );
      }

      const blob = await fileResponse.blob();
      const file = new File([blob], filename, {
        type: blob.type || 'video/mp4',
      });

      return qortalRequest({
        action: 'PUBLISH_QDN_RESOURCE',
        service: 'VIDEO',
        identifier: videoMetadata.identifier,
        name: videoMetadata.publisher.name,
        title,
        description,
        filename,
        file,
      });
    } finally {
      await fetch(downloadUrl, {
        method: 'DELETE',
      }).catch(() => undefined);
    }
  };

  const publishVideo = async (
    url: string,
    transcodePreset: VideoTranscodePreset = 'balanced'
  ) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setJob({
        phase: 'error',
        error: 'Please enter a YouTube URL.',
        message: null,
      });
      return null;
    }

    if (!address || !publicKey || !primaryName) {
      setJob({
        phase: 'error',
        error: 'A Qortal name, address, and public key are required before publishing.',
        message: null,
      });
      return null;
    }

    setJob({
      phase: 'downloading',
      error: null,
      message: 'Downloading from YouTube and preparing your video.',
    });

    const identifier = buildIdentifier(trimmedUrl);

    const payload: DownloadVideoRequest = {
      url: trimmedUrl,
      address,
      publicKey,
      name: primaryName,
      identifier,
      transcodePreset,
    };

    try {
      const response = await axios.post<DownloadVideoResponse>(
        `${HELPER_URL}/download`,
        payload,
        {
          timeout: 1000 * 60 * 60 * 6,
        }
      );

      setJob({
        phase: 'preparing-upload',
        error: null,
        message: 'Local helper finished download and AV1/Opus transcode. Preparing upload to QDN.',
      });

      if (!response.data.downloadUrl || !response.data.videoMetadata.localFilename) {
        throw new Error('Local helper did not return a downloadable video file.');
      }

      setJob({
        phase: 'waiting-for-approval',
        error: null,
        message: 'Waiting for Qortal approval to publish the video file.',
      });

      const publishedVideoResponse = await publishVideoFile(
        response.data.videoMetadata,
        response.data.downloadUrl,
        response.data.videoMetadata.localFilename
      );

      setJob({
        phase: 'publishing-metadata',
        error: null,
        message: 'Publishing video metadata and updating your dashboard.',
      });

      const publishedVideoMetadata: VideoMetadata = {
        ...response.data.videoMetadata,
        identifier:
          publishedVideoResponse?.identifier || response.data.videoMetadata.identifier,
        qdn: {
          service: 'VIDEO',
          name:
            publishedVideoResponse?.name || response.data.videoMetadata.publisher.name,
          identifier:
            publishedVideoResponse?.identifier || response.data.videoMetadata.identifier,
        },
      };

      await publishMetadataResource(publishedVideoMetadata);

      setLastPublishedVideo(publishedVideoMetadata);
      setJob({
        phase: 'success',
        error: null,
        message:
          response.data.message ||
          'Video submitted successfully. Processing... your video will appear in approximately 5 minutes.',
      });

      return {
        ...response.data,
        videoMetadata: publishedVideoMetadata,
      };
    } catch (caughtError) {
      const nextError = normalizePublishError(caughtError);

      setJob({
        phase: 'error',
        error: nextError,
        message: null,
      });
      return null;
    }
  };

  return {
    address,
    canPublish,
    job,
    lastPublishedVideo,
    primaryName,
    publicKey,
    publishVideo,
  };
};
