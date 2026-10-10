import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { kindLabel } from '@/features/media/kind';
import type { StoredAsset } from '@/features/media/types';

export function AssetThumbnail({ asset, size = 72 }: { asset: StoredAsset; size?: number }) {
  if (asset.kind === 'image') {
    return (
      <Image
        accessible={false}
        source={{ uri: asset.uri }}
        contentFit="cover"
        recyclingKey={asset.id}
        style={{ width: size, height: size, borderRadius: 16, backgroundColor: '#2A2E38' }}
      />
    );
  }

  const label = asset.kind === 'video' ? 'VID' : asset.name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';

  return (
    <View
      accessible={false}
      className="items-center justify-center rounded-2xl bg-ink"
      style={{ width: size, height: size }}>
      <Text className="text-xs font-semibold tracking-widest text-brass">{label}</Text>
      <Text className="mt-1 text-xs text-[#D9D3C8]">{kindLabel(asset.kind)}</Text>
    </View>
  );
}
