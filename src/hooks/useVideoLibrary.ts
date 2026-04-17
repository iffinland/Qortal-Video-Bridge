import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VideoMetadata } from '../types/video';
import { deleteVideoResources, publishVideoMetadataResource } from '../utils/metadata';
import { loadPublishedVideos } from '../utils/qdnVideoLibrary';

interface UseVideoLibraryParams {
  onActionMessage: (message: string | null) => void;
  pageSize: number;
  primaryName?: string | null;
}

export const useVideoLibrary = ({
  onActionMessage,
  pageSize,
  primaryName,
}: UseVideoLibraryParams) => {
  const [knownVideos, setKnownVideos] = useState<Record<string, VideoMetadata>>({});
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoMetadata | null>(null);
  const [deletedVideoIds, setDeletedVideoIds] = useState<Record<string, true>>({});
  const [isLibraryReady, setIsLibraryReady] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const libraryVideos = useMemo(() => Object.values(knownVideos), [knownVideos]);
  const sortedVideos = useMemo(() => {
    return libraryVideos
      .filter((video) => !deletedVideoIds[video.identifier])
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [deletedVideoIds, libraryVideos]);
  const paginatedVideos = useMemo(
    () =>
      sortedVideos.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [page, pageSize, sortedVideos]
  );
  const totalPages =
    sortedVideos.length > 0 ? Math.max(1, Math.ceil(sortedVideos.length / pageSize)) : 0;
  const currentPageCount = paginatedVideos.length;

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!primaryName) {
      setIsLibraryReady(false);
      setIsLoadingLibrary(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsLibraryReady(true);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [primaryName]);

  useEffect(() => {
    let cancelled = false;

    const loadKnownVideos = async () => {
      if (!primaryName) {
        setKnownVideos({});
        return;
      }

      if (!isLibraryReady) {
        return;
      }

      setIsLoadingLibrary(true);

      try {
        const result = await loadPublishedVideos(primaryName);

        if (cancelled) {
          return;
        }

        setKnownVideos(result.videos);

        if (import.meta.env.DEV) {
          console.info('[Uploader] loadKnownVideos results', result.debug);
        }
      } catch {
        if (!cancelled) {
          setKnownVideos({});
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLibrary(false);
        }
      }
    };

    void loadKnownVideos();

    return () => {
      cancelled = true;
    };
  }, [isLibraryReady, primaryName]);

  const addVideo = useCallback((video: VideoMetadata) => {
    setKnownVideos((current) => ({
      ...current,
      [video.identifier]: video,
    }));
  }, []);

  const saveVideoEdits = useCallback(
    async (nextVideo: VideoMetadata) => {
      await publishVideoMetadataResource(nextVideo);
      setKnownVideos((current) => ({
        ...current,
        [nextVideo.identifier]: nextVideo,
      }));
      onActionMessage('Video details updated.');
    },
    [onActionMessage]
  );

  const deleteVideo = useCallback(
    async (video: VideoMetadata) => {
      const confirmed = window.confirm(
        `Delete "${video.title}" from both VIDEO and JSON resources?`
      );

      if (!confirmed) {
        return;
      }

      setDeletingVideoId(video.identifier);
      setLibraryError(null);
      onActionMessage(null);

      try {
        await deleteVideoResources(video);
        setDeletedVideoIds((current) => ({
          ...current,
          [video.identifier]: true,
        }));
        setKnownVideos((current) => {
          const next = { ...current };
          delete next[video.identifier];
          return next;
        });
        onActionMessage('Video deleted from your dashboard.');
      } catch (caughtError) {
        setLibraryError(
          caughtError instanceof Error ? caughtError.message : 'Failed to delete video.'
        );
      } finally {
        setDeletingVideoId(null);
      }
    },
    [onActionMessage]
  );

  return {
    addVideo,
    currentPageCount,
    deleteVideo,
    deletingVideoId,
    editingVideo,
    isLoadingLibrary,
    libraryError,
    paginatedVideos,
    page,
    saveVideoEdits,
    setEditingVideo,
    setPage,
    sortedVideos,
    totalPages,
  };
};
