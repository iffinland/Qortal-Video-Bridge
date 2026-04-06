import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded';
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { objectToBase64, useAuth } from 'qapp-core';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CHANGELOG_IDENTIFIER, PROJECT_OWNER_ADDRESS } from '../config/project';
import type { ChangelogDocument, ChangelogEntry } from '../types/changelog';

interface ChangelogDialogProps {
  onClose: () => void;
  open: boolean;
}

const defaultDocument: ChangelogDocument = {
  entries: [],
};

const formatTimestamp = (value: string) => new Date(value).toLocaleString();

const renderInlineMarkdown = (text: string) => {
  const parts: Array<{ kind: 'text' | 'bold' | 'italic'; value: string }> = [];
  let remaining = text;

  while (remaining.length) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);
    const nextMatch = [boldMatch, italicMatch]
      .filter(Boolean)
      .sort((a, b) => (a!.index || 0) - (b!.index || 0))[0];

    if (!nextMatch || nextMatch.index === undefined) {
      parts.push({ kind: 'text', value: remaining });
      break;
    }

    if (nextMatch.index > 0) {
      parts.push({ kind: 'text', value: remaining.slice(0, nextMatch.index) });
    }

    const raw = nextMatch[0];
    const value = nextMatch[1];
    parts.push({
      kind: raw.startsWith('**') ? 'bold' : 'italic',
      value,
    });
    remaining = remaining.slice(nextMatch.index + raw.length);
  }

  return parts.map((part, index) => {
    if (part.kind === 'bold') {
      return (
        <Box key={index} component="strong">
          {part.value}
        </Box>
      );
    }

    if (part.kind === 'italic') {
      return (
        <Box key={index} component="em">
          {part.value}
        </Box>
      );
    }

    return <Box key={index} component="span">{part.value}</Box>;
  });
};

const renderChangelogContent = (content: string) => {
  const lines = content.split('\n');
  const output: ReactNode[] = [];
  let bulletItems: string[] = [];

  const flushBullets = () => {
    if (!bulletItems.length) {
      return;
    }

    output.push(
      <Box key={`bullets-${output.length}`} component="ul" sx={{ my: 0, pl: 3 }}>
        {bulletItems.map((item, index) => (
          <li key={index}>
            <Typography component="span">{renderInlineMarkdown(item)}</Typography>
          </li>
        ))}
      </Box>
    );
    bulletItems = [];
  };

  lines.forEach((line) => {
    if (line.startsWith('- ')) {
      bulletItems.push(line.slice(2));
      return;
    }

    flushBullets();

    if (!line.trim()) {
      output.push(<Box key={`space-${output.length}`} sx={{ height: 8 }} />);
      return;
    }

    output.push(
      <Typography key={`line-${output.length}`} variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {renderInlineMarkdown(line)}
      </Typography>
    );
  });

  flushBullets();
  return output;
};

const updateSelection = (
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  setter: (value: string) => void,
  transform: (selectedText: string) => string
) => {
  if (!textarea) {
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = currentValue.slice(start, end);
  const nextSelectedText = transform(selectedText || 'text');
  const nextValue =
    currentValue.slice(0, start) + nextSelectedText + currentValue.slice(end);

  setter(nextValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start, start + nextSelectedText.length);
  });
};

export const ChangelogDialog = ({ onClose, open }: ChangelogDialogProps) => {
  const { address, primaryName } = useAuth();
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [document, setDocument] = useState<ChangelogDocument>(defaultDocument);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isAdmin = address === PROJECT_OWNER_ADDRESS;
  const sortedEntries = useMemo(
    () =>
      [...document.entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [document.entries]
  );

  const loadChangelog = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextOwnerName = ((await qortalRequest({
        action: 'GET_PRIMARY_NAME',
        address: PROJECT_OWNER_ADDRESS,
      })) as string | null) || null;

      setOwnerName(nextOwnerName);

      if (!nextOwnerName) {
        setDocument(defaultDocument);
        return;
      }

      const response = await qortalRequest({
        action: 'FETCH_QDN_RESOURCE',
        service: 'JSON',
        name: nextOwnerName,
        identifier: CHANGELOG_IDENTIFIER,
      });

      const nextDocument =
        typeof response === 'string'
          ? (JSON.parse(response) as ChangelogDocument)
          : (response as ChangelogDocument);

      setDocument(nextDocument?.entries ? nextDocument : defaultDocument);
    } catch {
      setDocument(defaultDocument);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadChangelog();
    }
  }, [open]);

  const handleSave = async () => {
    if (!isAdmin || !primaryName) {
      setError('Only the project admin can post changelog updates.');
      return;
    }

    if (!draft.trim()) {
      setError('Write a changelog entry first.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const nextEntry: ChangelogEntry = {
        id: crypto.randomUUID(),
        content: draft.trim(),
        createdAt: new Date().toISOString(),
      };

      const nextDocument: ChangelogDocument = {
        entries: [nextEntry, ...document.entries],
      };

      const base64 = await objectToBase64(nextDocument);

      await qortalRequest({
        action: 'PUBLISH_QDN_RESOURCE',
        service: 'JSON',
        identifier: CHANGELOG_IDENTIFIER,
        name: primaryName,
        title: 'VideoBox changelog',
        description: 'Project changelog entries',
        filename: 'changelog.json',
        data64: base64,
      });

      setDocument(nextDocument);
      setDraft('');
      setInfoMessage('Changelog entry published.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Could not publish changelog.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          background:
            'radial-gradient(circle at top left, rgba(207, 73, 82, 0.1), transparent 28%), radial-gradient(circle at top right, rgba(47, 121, 200, 0.12), transparent 32%), linear-gradient(180deg, rgba(20, 27, 39, 0.98), rgba(14, 20, 31, 0.98))',
          color: 'var(--vb-text-main)',
          border: '1px solid var(--vb-border)',
        },
      }}
    >
      <DialogTitle>Changelog</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {ownerName ? (
            <Typography variant="body2" color="text.secondary">
              Updates published by {ownerName}
            </Typography>
          ) : null}

          {isAdmin ? (
            <CardContent
              sx={{
                p: 0,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                pb: 2,
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  Admin editor
                </Typography>

                <Stack direction="row" spacing={1}>
                  <IconButton
                    onClick={() =>
                      updateSelection(textareaRef.current, draft, setDraft, (value) => `**${value}**`)
                    }
                  >
                    <FormatBoldRoundedIcon />
                  </IconButton>
                  <IconButton
                    onClick={() =>
                      updateSelection(textareaRef.current, draft, setDraft, (value) => `*${value}*`)
                    }
                  >
                    <FormatItalicRoundedIcon />
                  </IconButton>
                  <IconButton
                    onClick={() =>
                      updateSelection(textareaRef.current, draft, setDraft, (value) => `- ${value}`)
                    }
                  >
                    <FormatListBulletedRoundedIcon />
                  </IconButton>
                </Stack>

                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  label="Write changelog entry"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  inputRef={textareaRef}
                />

                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isSaving}
                  sx={{ width: 'fit-content' }}
                >
                  {isSaving ? 'Publishing...' : 'Publish changelog'}
                </Button>
              </Stack>
            </CardContent>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
          {infoMessage ? <Alert severity="success">{infoMessage}</Alert> : null}

          {isLoading ? (
            <Typography color="text.secondary">Loading changelog...</Typography>
          ) : sortedEntries.length === 0 ? (
            <Typography color="text.secondary">
              No changelog entries published yet.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {sortedEntries.map((entry) => (
                <Box
                  key={entry.id}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(entry.createdAt)}
                    </Typography>
                    <Box>{renderChangelogContent(entry.content)}</Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
