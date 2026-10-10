import { useCallback, useRef, useState } from 'react';

import { MediaError } from '@/features/media/errors';

export function useAsyncAction() {
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [error, setError] = useState<MediaError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async (label: string, task: () => Promise<string | void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingLabel(label);
    setError(null);
    setNotice(null);
    try {
      const message = await task();
      if (message) setNotice(message);
    } catch (caught) {
      if (caught instanceof MediaError && caught.code === 'cancelled') return;
      if (caught instanceof MediaError) {
        setError(caught);
        return;
      }
      setError(new MediaError(caught instanceof Error ? caught.message : 'Something went wrong.', 'failed'));
    } finally {
      inFlight.current = false;
      setPendingLabel(null);
    }
  }, []);

  return {
    pendingLabel,
    error,
    notice,
    setError,
    setNotice,
    run,
    busy: pendingLabel !== null,
  };
}
