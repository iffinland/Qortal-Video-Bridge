import { Stack } from '@mui/material';
import { lazy, Suspense, useState } from 'react';
import { CurrentJobCard } from './uploader/CurrentJobCard';
import { LIBRARY_PAGE_SIZE, TRANSCODE_PRESET_OPTIONS } from './uploader/constants';
import { LibraryPaginationCard } from './uploader/LibraryPaginationCard';
import { LocalHelperCard } from './uploader/LocalHelperCard';
import { UploaderAlerts } from './uploader/UploaderAlerts';
import { UploaderHero } from './uploader/UploaderHero';
import { VideoLibraryCard } from './uploader/VideoLibraryCard';
import { useHelperPanel } from '../hooks/useHelperPanel';
import { useUploaderForm } from '../hooks/useUploaderForm';
import { useVideoLibrary } from '../hooks/useVideoLibrary';
import { useVideoPublish } from '../hooks/useVideoPublish';

const EditVideoDialog = lazy(async () => ({
  default: (await import('./EditVideoDialog')).EditVideoDialog,
}));

const Uploader = () => {
  const [librarySuccessMessage, setLibrarySuccessMessage] = useState<string | null>(
    null
  );
  const { canPublish, job, lastPublishedVideo, primaryName, publishVideo } =
    useVideoPublish();
  const {
    actionError,
    health,
    helperError,
    helperSuccessMessage,
    isLoadingHealth,
    isRunningCleanup,
    refreshHealth,
    runCleanup,
  } = useHelperPanel();

  const isBusy =
    job.phase === 'downloading' ||
    job.phase === 'preparing-upload' ||
    job.phase === 'waiting-for-approval' ||
    job.phase === 'publishing-metadata';
  const {
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
  } = useVideoLibrary({
    onActionMessage: setLibrarySuccessMessage,
    pageSize: LIBRARY_PAGE_SIZE,
    primaryName,
  });
  const {
    duplicateWarning,
    handleProcessVideo,
    presetSummary,
    setTranscodePreset,
    setUrl,
    transcodePreset,
    url,
  } = useUploaderForm({
    defaultPreset: health?.defaultPreset,
    knownVideos: sortedVideos,
    onVideoPublished: addVideo,
    presetOptions: TRANSCODE_PRESET_OPTIONS,
    publishVideo,
  });

  return (
    <Stack spacing={3}>
      <UploaderHero
        canPublish={canPublish}
        healthOk={Boolean(health?.ok)}
        isBusy={isBusy}
        onProcessVideo={handleProcessVideo}
        presetSummary={presetSummary}
        setTranscodePreset={setTranscodePreset}
        transcodePreset={transcodePreset}
        url={url}
        setUrl={setUrl}
        availablePresets={health?.availablePresets}
      />

      <UploaderAlerts
        actionError={actionError}
        duplicateWarning={duplicateWarning}
        helperError={helperError}
        helperSuccessMessage={helperSuccessMessage}
        jobError={job.error}
        jobMessage={job.message}
        lastPublishedVideo={lastPublishedVideo}
        libraryError={libraryError}
        librarySuccessMessage={librarySuccessMessage}
      />

      {job.phase !== 'idle' ? <CurrentJobCard jobPhase={job.phase} /> : null}

      <LocalHelperCard
        health={health}
        healthOk={Boolean(health?.ok)}
        isLoadingHealth={isLoadingHealth}
        isRunningCleanup={isRunningCleanup}
        onCleanup={() => void runCleanup()}
        onRefresh={() => void refreshHealth()}
      />

      <VideoLibraryCard
        deletingVideoId={deletingVideoId}
        editingVideo={setEditingVideo}
        isLoadingLibrary={isLoadingLibrary}
        onDelete={deleteVideo}
        primaryName={primaryName || undefined}
        videos={paginatedVideos}
      />

      {totalPages > 0 ? (
        <LibraryPaginationCard
          currentPageCount={currentPageCount}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
        />
      ) : null}

      <Suspense fallback={null}>
        {editingVideo ? (
          <EditVideoDialog
            open={Boolean(editingVideo)}
            video={editingVideo}
            onClose={() => setEditingVideo(null)}
            onSave={saveVideoEdits}
          />
        ) : null}
      </Suspense>
    </Stack>
  );
};

export default Uploader;
