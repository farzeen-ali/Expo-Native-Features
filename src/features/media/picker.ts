import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { MediaError } from '@/features/media/errors';
import { inferKind } from '@/features/media/kind';
import type { IncomingAsset } from '@/features/media/types';

type Access = { granted: boolean; canAskAgain: boolean };

function assertAccess(permission: Access, denied: string, blocked: string) {
  if (permission.granted) return;
  throw new MediaError(permission.canAskAgain ? denied : blocked, 'permission', permission.canAskAgain);
}

function fromLibraryAsset(asset: ImagePicker.ImagePickerAsset): IncomingAsset {
  const name = asset.fileName ?? (asset.type === 'video' ? 'video.mp4' : 'photo.jpg');
  const kind =
    asset.type === 'video' || asset.type === 'pairedVideo'
      ? 'video'
      : asset.type === 'image' || asset.type === 'livePhoto'
        ? 'image'
        : inferKind(name, asset.mimeType);
  return {
    uri: asset.uri,
    name,
    kind,
    mimeType: asset.mimeType ?? null,
    size: asset.fileSize ?? null,
  };
}

export async function pickLibraryAssets(): Promise<IncomingAsset[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  assertAccess(
    permission,
    'Photo library access was denied. Allow it to pick photos and videos.',
    'Photo library access is blocked. Enable Photos for this app in Settings.',
  );

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.9,
    allowsMultipleSelection: true,
    selectionLimit: 10,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets.map(fromLibraryAsset);
}

export async function pickStoredFiles(): Promise<IncomingAsset[] | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      kind: inferKind(asset.name, asset.mimeType),
      mimeType: asset.mimeType ?? null,
      size: asset.size ?? null,
    }));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    throw new MediaError(
      error instanceof Error && error.message ? error.message : 'Could not open the file picker.',
      'failed',
    );
  }
}
