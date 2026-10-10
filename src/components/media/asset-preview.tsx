import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/hooks/use-palette';

import { MediaIcon } from '@/components/media/media-icon';
import { StatusBanner } from '@/components/media/status-banner';
import { MediaError, toMediaError } from '@/features/media/errors';
import { formatBytes, formatWhen } from '@/features/media/format';
import { kindLabel } from '@/features/media/kind';
import { openSystemSettings } from '@/features/media/settings';
import { shareStoredAsset } from '@/features/media/share';
import type { StoredAsset } from '@/features/media/types';
import { deleteStoredAsset } from '@/features/media/vault';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      style={{ width: '100%', height: 320, backgroundColor: '#14161C' }}
    />
  );
}

export function AssetPreviewModal({
  asset,
  onClose,
  onChanged,
}: {
  asset: StoredAsset | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const assetId = asset?.id ?? null;
  const [sessionId, setSessionId] = useState(assetId);
  const [error, setError] = useState<MediaError | null>(null);
  const [pending, setPending] = useState<'share' | 'delete' | null>(null);

  if (sessionId !== assetId) {
    setSessionId(assetId);
    setError(null);
    setPending(null);
  }

  async function onShare() {
    if (!asset || pending) return;
    setPending('share');
    setError(null);
    try {
      await shareStoredAsset(asset);
    } catch (caught) {
      const next = toMediaError(caught, 'Could not share this file.');
      if (next.code !== 'cancelled') setError(next);
    } finally {
      setPending(null);
    }
  }

  function onDelete() {
    if (!asset || pending) return;
    Alert.alert('Delete file?', `${asset.name} will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void removeAsset(asset);
        },
      },
    ]);
  }

  async function removeAsset(target: StoredAsset) {
    setPending('delete');
    setError(null);
    try {
      await deleteStoredAsset(target.id);
      onChanged();
      onClose();
    } catch (caught) {
      setError(toMediaError(caught, 'Could not delete this file.'));
    } finally {
      setPending(null);
    }
  }

  return (
    <Modal
      visible={asset !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View className="flex-1 bg-paper dark:bg-ink" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-5 pb-3">
          <Text accessibilityRole="header" className="text-xl font-semibold text-ink dark:text-paper">
            Preview
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            onPress={onClose}
            className="min-h-12 min-w-12 items-center justify-center rounded-full bg-foam dark:bg-panel">
            <MediaIcon name="close" color={palette.icon} size={18} />
          </Pressable>
        </View>

        {asset ? (
          <View className="flex-1 px-5" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="overflow-hidden rounded-[28px] bg-ink">
              {asset.kind === 'image' ? (
                <Image
                  source={{ uri: asset.uri }}
                  accessibilityLabel={asset.name}
                  contentFit="contain"
                  style={{ width: '100%', height: 320 }}
                />
              ) : null}
              {asset.kind === 'video' ? <VideoPreview key={asset.id} uri={asset.uri} /> : null}
              {asset.kind === 'file' ? (
                <View className="h-48 items-center justify-center px-6">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-brass">
                    {kindLabel(asset.kind)}
                  </Text>
                  <Text className="mt-3 text-center text-lg leading-7 text-paper">{asset.name}</Text>
                </View>
              ) : null}
            </View>

            <Text className="mt-5 text-lg font-semibold text-ink dark:text-paper" numberOfLines={2}>
              {asset.name}
            </Text>
            <Text className="mt-1 text-base leading-6 text-mist dark:text-[#A39B90]">
              {kindLabel(asset.kind)} · {formatBytes(asset.size)} · {formatWhen(asset.createdAt)}
            </Text>

            {error ? (
              <View className="mt-4">
                <StatusBanner
                  tone="error"
                  message={error.message}
                  actionLabel={error.code === 'permission' && !error.canAskAgain ? 'Open Settings' : undefined}
                  onAction={error.code === 'permission' && !error.canAskAgain ? openSystemSettings : undefined}
                  onDismiss={() => setError(null)}
                />
              </View>
            ) : null}

            <View className="mt-6 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Share ${asset.name}`}
                disabled={pending !== null}
                onPress={() => {
                  void onShare();
                }}
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brass disabled:opacity-50">
                {pending === 'share' ? (
                  <ActivityIndicator color="#2A2112" />
                ) : (
                  <MediaIcon name="share" color="#2A2112" size={18} />
                )}
                <Text className="text-base font-semibold text-brassInk">Share</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${asset.name}`}
                disabled={pending !== null}
                onPress={onDelete}
                className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-foam disabled:opacity-50 dark:bg-panel">
                {pending === 'delete' ? (
                  <ActivityIndicator color={palette.danger} />
                ) : (
                  <MediaIcon name="trash" color={palette.danger} size={18} />
                )}
                <Text className="text-base font-semibold" style={{ color: palette.danger }}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
