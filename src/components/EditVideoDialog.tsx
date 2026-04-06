import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { VideoMetadata } from '../types/video';

interface EditVideoDialogProps {
  onClose: () => void;
  onSave: (video: VideoMetadata) => Promise<void>;
  open: boolean;
  video: VideoMetadata | null;
}

export const EditVideoDialog = ({
  onClose,
  onSave,
  open,
  video,
}: EditVideoDialogProps) => {
  const [draft, setDraft] = useState<VideoMetadata | null>(video);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(video);
    setError(null);
  }, [video]);

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    if (!draft.title.trim()) {
      setError('Title is required.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
      });
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to save edits.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background:
            'radial-gradient(circle at top left, rgba(207, 73, 82, 0.1), transparent 28%), radial-gradient(circle at top right, rgba(47, 121, 200, 0.12), transparent 32%), linear-gradient(180deg, rgba(20, 27, 39, 0.98), rgba(14, 20, 31, 0.98))',
          color: 'var(--vb-text-main)',
          border: '1px solid var(--vb-border)',
        },
      }}
    >
      <DialogTitle>Edit video details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Title"
            value={draft?.title || ''}
            onChange={(event) =>
              setDraft((current) => (current ? { ...current, title: event.target.value } : current))
            }
            fullWidth
          />

          <TextField
            label="Description"
            value={draft?.description || ''}
            onChange={(event) =>
              setDraft((current) =>
                current ? { ...current, description: event.target.value } : current
              )
            }
            fullWidth
            multiline
            minRows={4}
          />

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Switch
              checked={draft?.visibility === 'public'}
              onChange={(event) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        visibility: event.target.checked ? 'public' : 'private',
                      }
                    : current
                )
              }
            />
            <Typography variant="body2">
              {draft?.visibility === 'public'
                ? 'Public metadata'
                : 'Private to dashboard'}
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
