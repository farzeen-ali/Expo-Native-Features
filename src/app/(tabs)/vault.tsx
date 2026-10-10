import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';

import { AssetPreviewModal } from '@/components/media/asset-preview';
import { AssetThumbnail } from '@/components/media/asset-thumbnail';
import { MediaIcon } from '@/components/media/media-icon';
import { Reveal } from '@/components/media/reveal';
import { ScreenFrame } from '@/components/media/screen-frame';
import { StatusBanner } from '@/components/media/status-banner';
import { Fonts } from '@/constants/theme';
import { formatBytes, formatWhen } from '@/features/media/format';
import { kindLabel } from '@/features/media/kind';
import { openSystemSettings } from '@/features/media/settings';
import { shareStoredAsset } from '@/features/media/share';
import type { StoredAsset } from '@/features/media/types';
import { deleteStoredAsset, supportsLocalFiles } from '@/features/media/vault';
import { useAsyncAction } from '@/hooks/use-async-action';
import { usePalette } from '@/hooks/use-palette';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useVault } from '@/hooks/use-vault';

export default function VaultScreen() {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { assets, loading, refreshing, loadError, refresh } = useVault();
  const { pendingLabel, error, notice, setError, setNotice, run, busy } = useAsyncAction();
  const [selected, setSelected] = useState<StoredAsset | null>(null);
  const total = assets.reduce((sum, asset) => sum + (asset.size ?? 0), 0);

  function confirmDelete(asset: StoredAsset) {
    Alert.alert('Delete file?', `${asset.name} will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void run('Deleting', async () => {
            await deleteStoredAsset(asset.id);
            if (selected?.id === asset.id) setSelected(null);
            await refresh();
            return 'File deleted.';
          });
        },
      },
    ]);
  }

  return (
    <ScreenFrame>
      <FlatList
        data={loading && assets.length === 0 ? [] : assets}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void refresh('manual')}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListHeaderComponent={
          <View>
            <Reveal reduced={reduced}>
              <Text className="text-xs font-semibold uppercase tracking-widest text-mist dark:text-[#A39B90]">
                Library
              </Text>
              <Text
                accessibilityRole="header"
                className="mt-2 text-5xl text-ink dark:text-paper"
                style={{ fontFamily: Fonts.serif }}>
                Vault
              </Text>
              <Text className="mt-3 text-base leading-6 text-mist dark:text-[#A39B90]">
                {supportsLocalFiles()
                  ? 'Files saved in this app’s documents folder.'
                  : 'Items in this browser last for the current session.'}
              </Text>
              <Text className="mt-2 text-sm text-ink dark:text-paper">
                {assets.length === 0
                  ? 'Nothing stored yet'
                  : `${assets.length} ${assets.length === 1 ? 'item' : 'items'} · ${formatBytes(total)}`}
              </Text>
            </Reveal>
            {loadError ? (
              <View className="mt-4">
                <StatusBanner tone="error" message={loadError} />
              </View>
            ) : null}
            {error ? (
              <View className="mt-4">
                <StatusBanner
                  tone="error"
                  message={error.message}
                  actionLabel={error.code === 'permission' && !error.canAskAgain ? 'Open Settings' : undefined}
                  onAction={
                    error.code === 'permission' && !error.canAskAgain ? () => void openSystemSettings() : undefined
                  }
                  onDismiss={() => setError(null)}
                />
              </View>
            ) : null}
            {notice ? (
              <View className="mt-4">
                <StatusBanner tone="success" message={notice} onDismiss={() => setNotice(null)} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="mt-6 gap-3">
              {[0, 1, 2].map((item) => (
                <View key={item} className="h-24 rounded-[24px]" style={{ backgroundColor: palette.bone }} />
              ))}
            </View>
          ) : (
            <View className="mt-10 rounded-[28px] border border-dashed border-ink/20 px-5 py-8 dark:border-white/15">
              <Text className="text-lg font-semibold text-ink dark:text-paper">The vault is empty</Text>
              <Text className="mt-2 text-base leading-6 text-mist dark:text-[#A39B90]">
                Capture a photo or pick a file from Studio, and it will show up here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View className="mt-3 rounded-[24px] border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-panel">
            <View className="flex-row gap-3">
              <AssetThumbnail asset={item} />
              <View className="flex-1 justify-center">
                <Text className="text-base font-semibold text-ink dark:text-paper" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="mt-1 text-sm leading-5 text-mist dark:text-[#A39B90]">
                  {kindLabel(item.kind)} · {formatBytes(item.size)}
                </Text>
                <Text className="text-sm leading-5 text-mist dark:text-[#A39B90]">{formatWhen(item.createdAt)}</Text>
              </View>
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Preview ${item.name}`}
                onPress={() => setSelected(item)}
                className="min-h-12 items-center justify-center rounded-full bg-foam px-4 dark:bg-ink">
                <Text className="text-sm font-semibold text-ink dark:text-paper">Preview</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Share ${item.name}`}
                disabled={busy}
                onPress={() => {
                  void run(`Sharing ${item.id}`, async () => {
                    await shareStoredAsset(item);
                  });
                }}
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-brass px-4 disabled:opacity-50">
                {pendingLabel === `Sharing ${item.id}` ? (
                  <ActivityIndicator color={palette.brassInk} />
                ) : (
                  <MediaIcon name="share" color={palette.brassInk} size={16} />
                )}
                <Text className="text-sm font-semibold text-brassInk">Share</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
                disabled={busy}
                onPress={() => confirmDelete(item)}
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-full px-4 disabled:opacity-50">
                <MediaIcon name="trash" color={palette.danger} size={16} />
                <Text className="text-sm font-semibold" style={{ color: palette.danger }}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <AssetPreviewModal asset={selected} onClose={() => setSelected(null)} onChanged={() => void refresh()} />
    </ScreenFrame>
  );
}
