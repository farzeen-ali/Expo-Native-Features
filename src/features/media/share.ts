import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { MediaError } from '@/features/media/errors';
import type { StoredAsset } from '@/features/media/types';

function utiFor(asset: StoredAsset): string {
  if (asset.kind === 'image') return 'public.image';
  if (asset.kind === 'video') return 'public.movie';
  if (asset.mimeType === 'application/pdf' || asset.name.toLowerCase().endsWith('.pdf')) {
    return 'com.adobe.pdf';
  }
  return 'public.data';
}

export async function shareStoredAsset(asset: StoredAsset): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new MediaError(
      Platform.OS === 'web'
        ? 'Sharing is unavailable in this browser. Use the app on a device, or a browser with the Web Share API over HTTPS.'
        : 'Sharing is not available on this device.',
      'unavailable',
    );
  }

  try {
    await Sharing.shareAsync(asset.uri, {
      mimeType: asset.mimeType ?? undefined,
      dialogTitle: `Share ${asset.name}`,
      UTI: utiFor(asset),
    });
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) {
      throw new MediaError('Share sheet closed.', 'cancelled');
    }
    throw new MediaError(
      error instanceof Error && error.message ? error.message : 'Could not open the share sheet.',
      'failed',
    );
  }
}
