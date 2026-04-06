import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQortBalance } from 'qapp-core';
import { useState } from 'react';
import { PROJECT_OWNER_ADDRESS } from '../config/project';
import { getQortalActionErrorMessage } from '../utils/qortalErrors';

interface SupportProjectDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
}

export const SupportProjectDialog = ({
  onClose,
  onSuccess,
  open,
}: SupportProjectDialogProps) => {
  const { value: balance, isLoading } = useQortBalance();
  const [amount, setAmount] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a valid QORT amount.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await qortalRequest({
        action: 'SEND_COIN',
        coin: 'QORT',
        recipient: PROJECT_OWNER_ADDRESS,
        amount: numericAmount,
      });
      onSuccess();
      onClose();
    } catch (caughtError) {
      setError(getQortalActionErrorMessage(caughtError, 'Support payment failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          background:
            'radial-gradient(circle at top left, rgba(207, 73, 82, 0.1), transparent 28%), radial-gradient(circle at top right, rgba(47, 121, 200, 0.12), transparent 32%), linear-gradient(180deg, rgba(20, 27, 39, 0.98), rgba(14, 20, 31, 0.98))',
          color: 'var(--vb-text-main)',
          border: '1px solid var(--vb-border)',
        },
      }}
    >
      <DialogTitle>Support Project</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Send support directly to the project owner wallet.
          </Typography>

          <Alert severity="info">
            After clicking send, approve the Qortal payment window promptly.
          </Alert>

          {isSubmitting ? (
            <Alert severity="warning">
              Waiting for Qortal approval. Please confirm the payment in the popup
              window.
            </Alert>
          ) : null}

          <Typography variant="body2">
            Wallet balance:{' '}
            {isLoading ? 'Loading...' : `${balance?.toFixed(8) || '0.00000000'} QORT`}
          </Typography>

          <TextField
            type="number"
            label="Support amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputProps={{ min: 0, step: '0.01' }}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSend} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Support'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
