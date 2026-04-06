export const getQortalActionErrorMessage = (
  caughtError: unknown,
  fallbackMessage: string
) => {
  const errorRecord =
    typeof caughtError === 'object' && caughtError !== null
      ? (caughtError as Record<string, unknown>)
      : null;

  const message =
    typeof errorRecord?.message === 'string'
      ? errorRecord.message
      : caughtError instanceof Error
        ? caughtError.message
        : '';

  const errorCode =
    typeof errorRecord?.error === 'string' ? errorRecord.error.toLowerCase() : '';

  if (
    errorCode === 'timeout' ||
    message.toLowerCase().includes('timed out') ||
    message.toLowerCase().includes('timeout')
  ) {
    return 'Qortal approval timed out. If a payment window opened, approve it within 30 seconds and try again.';
  }

  return message || fallbackMessage;
};
