import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { listStoredAssets } from '@/features/media/vault';
import type { StoredAsset } from '@/features/media/types';

export function useVault() {
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async (mode: 'silent' | 'manual' = 'silent') => {
    if (mode === 'manual') setRefreshing(true);
    else if (!hasLoaded.current) setLoading(true);
    try {
      setAssets(await listStoredAssets());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not read saved files.');
    } finally {
      hasLoaded.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { assets, loading, refreshing, loadError, refresh };
}
