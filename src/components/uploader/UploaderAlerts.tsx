import { Alert } from '@mui/material';
import { formatDuration } from 'qapp-core';
import type { VideoMetadata } from '../../types/video';

interface UploaderAlertsProps {
  actionError: string | null;
  duplicateWarning: string | null;
  helperError: string | null;
  helperSuccessMessage: string | null;
  jobError: string | null;
  jobMessage: string | null;
  lastPublishedVideo: VideoMetadata | null;
  libraryError: string | null;
  librarySuccessMessage: string | null;
}

export const UploaderAlerts = ({
  actionError,
  duplicateWarning,
  helperError,
  helperSuccessMessage,
  jobError,
  jobMessage,
  lastPublishedVideo,
  libraryError,
  librarySuccessMessage,
}: UploaderAlertsProps) => (
  <>
    {jobMessage ? <Alert severity="info">{jobMessage}</Alert> : null}
    {jobError ? <Alert severity="error">{jobError}</Alert> : null}
    {duplicateWarning ? <Alert severity="warning">{duplicateWarning}</Alert> : null}
    {libraryError ? <Alert severity="error">{libraryError}</Alert> : null}
    {helperError ? <Alert severity="warning">{helperError}</Alert> : null}
    {actionError ? <Alert severity="error">{actionError}</Alert> : null}
    {helperSuccessMessage ? <Alert severity="success">{helperSuccessMessage}</Alert> : null}
    {librarySuccessMessage ? <Alert severity="success">{librarySuccessMessage}</Alert> : null}
    {lastPublishedVideo ? (
      <Alert severity="success">
        Latest submitted video: <strong>{lastPublishedVideo.title}</strong>
        {lastPublishedVideo.duration
          ? ` (${formatDuration(lastPublishedVideo.duration)})`
          : null}
      </Alert>
    ) : null}
  </>
);
