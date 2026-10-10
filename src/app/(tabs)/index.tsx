import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AssetPreviewModal } from '@/components/media/asset-preview';
import { AssetThumbnail } from '@/components/media/asset-thumbnail';
import { MediaIcon, type MediaIconName } from '@/components/media/media-icon';
import { Reveal } from '@/components/media/reveal';
import { ScreenFrame } from '@/components/media/screen-frame';
import { StatusBanner } from '@/components/media/status-banner';
import { Fonts } from '@/constants/theme';
import { formatBytes } from '@/features/media/format';
import { pickLibraryAssets, pickStoredFiles } from '@/features/media/picker';
import { openSystemSettings } from '@/features/media/settings';
import type { StoredAsset } from '@/features/media/types';
import {
  downloadIntoVault,
  SAMPLE_DOWNLOAD_URL,
  saveIncomingAssets,
  supportsLocalFiles,
} from '@/features/media/vault';
import { useAsyncAction } from '@/hooks/use-async-action';
import { usePalette } from '@/hooks/use-palette';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useVault } from '@/hooks/use-vault';

function savedMessage(count: number) {
  const noun = count === 1 ? 'file' : 'files';
  return supportsLocalFiles()
    ? `Saved ${count} ${noun} on this device.`
    : `Added ${count} ${noun} for this browser session.`;
}

export default function StudioScreen() {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { assets, loading, refresh } = useVault();
  const { pendingLabel, error, notice, setError, setNotice, run, busy } = useAsyncAction();
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [selected, setSelected] = useState<StoredAsset | null>(null);
  const localFiles = supportsLocalFiles();

  async function importFrom(label: string, pick: () => Promise<{ length: number } | null>) {
    await run(label, async () => {
      try {
        const picked = await pick();
        if (!picked || picked.length === 0) return;
        return savedMessage(picked.length);
      } finally {
        await refresh();
      }
    });
  }

  return (
    <ScreenFrame>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 }}>
        <Reveal reduced={reduced}>
          <Text className="text-xs font-semibold uppercase tracking-widest text-mist dark:text-[#A39B90]">
            On device
          </Text>
          <Text
            accessibilityRole="header"
            className="mt-2 text-5xl text-ink dark:text-paper"
            style={{ fontFamily: Fonts.serif }}>
            Studio
          </Text>
          <Text className="mt-3 max-w-xl text-base leading-6 text-mist dark:text-[#A39B90]">
            Capture a photo or video, pull files from your library, download a URL, and share what you keep.
          </Text>
        </Reveal>

        {!localFiles ? (
          <View className="mt-5">
            <StatusBanner
              tone="info"
              message="This browser keeps new items for the current session. Open the app on a phone to save, download, and share files."
            />
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

        <Reveal delay={80} reduced={reduced}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open camera"
            disabled={busy}
            onPress={() => router.push('/camera')}
            className="mt-6 rounded-[28px] bg-ink px-5 py-6 disabled:opacity-60">
            <View className="flex-row items-center justify-between">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brass">
                <MediaIcon name="camera" color={palette.brassInk} size={22} />
              </View>
              <Text className="text-xs font-semibold uppercase tracking-widest text-brass">Lens</Text>
            </View>
            <Text className="mt-6 text-3xl text-paper" style={{ fontFamily: Fonts.serif }}>
              Open the camera
            </Text>
            <Text className="mt-2 text-base leading-6 text-[#D9D3C8]">
              Take a photo or record up to a minute of video. Permission is requested before the preview starts.
            </Text>
          </Pressable>
        </Reveal>

        <View className="mt-3 flex-row gap-3">
          <ImportCard
            icon="photos"
            title="Gallery"
            detail="Photos and videos"
            busy={busy}
            pending={pendingLabel === 'Opening gallery'}
            reduced={reduced}
            delay={140}
            onPress={() =>
              void importFrom('Opening gallery', async () => {
                const picked = await pickLibraryAssets();
                if (!picked) return null;
                const saved = await saveIncomingAssets(picked);
                return saved;
              })
            }
          />
          <ImportCard
            icon="files"
            title="Files"
            detail="From storage"
            busy={busy}
            pending={pendingLabel === 'Opening files'}
            reduced={reduced}
            delay={180}
            onPress={() =>
              void importFrom('Opening files', async () => {
                const picked = await pickStoredFiles();
                if (!picked) return null;
                return saveIncomingAssets(picked);
              })
            }
          />
        </View>

        <Reveal delay={220} reduced={reduced}>
          <View className="mt-3 rounded-[28px] border border-ink/10 bg-white px-5 py-5 dark:border-white/10 dark:bg-panel">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-foam dark:bg-ink">
                <MediaIcon name="download" color={palette.icon} size={22} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-ink dark:text-paper">Download</Text>
                <Text className="text-sm leading-5 text-mist dark:text-[#A39B90]">
                  Save a file from a link into the vault.
                </Text>
              </View>
            </View>
            <TextInput
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              inputMode="url"
              placeholder="https://example.com/file.pdf"
              placeholderTextColor={palette.placeholder}
              accessibilityLabel="Download URL"
              className="mt-4 min-h-12 rounded-2xl border border-ink/10 bg-paper px-4 text-base text-ink dark:border-white/10 dark:bg-ink dark:text-paper"
            />
            {pendingLabel === 'Downloading' ? (
              <View className="mt-3">
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={
                    progress == null ? undefined : { min: 0, max: 100, now: Math.round(progress * 100) }
                  }
                  className="h-2 overflow-hidden rounded-full bg-foam dark:bg-ink">
                  <View
                    className="h-full rounded-full bg-brass"
                    style={{ width: progress == null ? '28%' : `${Math.max(4, Math.round(progress * 100))}%` }}
                  />
                </View>
                <Text className="mt-2 text-sm text-mist dark:text-[#A39B90]">
                  {progress == null ? 'Downloading…' : `${Math.round(progress * 100)}% saved`}
                </Text>
              </View>
            ) : null}
            <View className="mt-4 flex-row flex-wrap gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={busy || url.trim().length === 0}
                onPress={() => {
                  void run('Downloading', async () => {
                    try {
                      await downloadIntoVault(url, setProgress);
                      setUrl('');
                      return 'Download saved on this device.';
                    } finally {
                      setProgress(null);
                      await refresh();
                    }
                  });
                }}
                className="min-h-12 flex-row items-center justify-center rounded-full bg-ink px-5 disabled:opacity-40 dark:bg-paper">
                {pendingLabel === 'Downloading' ? (
                  <ActivityIndicator color={palette.dark ? '#14161C' : '#F3EEE6'} />
                ) : (
                  <Text className="text-base font-semibold text-paper dark:text-ink">Save file</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fill the field with a sample PDF link"
                disabled={busy}
                onPress={() => setUrl(SAMPLE_DOWNLOAD_URL)}
                className="min-h-12 items-center justify-center rounded-full px-4">
                <Text className="text-base font-semibold text-ink dark:text-paper">Use sample PDF</Text>
              </Pressable>
            </View>
          </View>
        </Reveal>

        <View className="mt-8 flex-row items-end justify-between">
          <Text accessibilityRole="header" className="text-xl font-semibold text-ink dark:text-paper">
            Recent
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/vault')} className="min-h-12 justify-center">
            <Text className="text-base font-semibold text-ink dark:text-paper">Open vault</Text>
          </Pressable>
        </View>

        {loading && assets.length === 0 ? (
          <View className="mt-3 flex-row gap-3">
            {[0, 1, 2].map((item) => (
              <View key={item} className="h-36 w-28 rounded-2xl" style={{ backgroundColor: palette.bone }} />
            ))}
          </View>
        ) : null}

        {!loading && assets.length === 0 ? (
          <Text className="mt-3 text-base leading-6 text-mist dark:text-[#A39B90]">
            Saved photos, videos, and downloads will line up here.
          </Text>
        ) : null}

        {assets.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 12 }}>
            {assets.slice(0, 8).map((asset) => (
              <Pressable
                key={asset.id}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${asset.name}`}
                onPress={() => setSelected(asset)}
                className="w-28">
                <AssetThumbnail asset={asset} size={112} />
                <Text numberOfLines={1} className="mt-2 text-sm text-ink dark:text-paper">
                  {asset.name}
                </Text>
                <Text className="text-xs text-mist dark:text-[#A39B90]">{formatBytes(asset.size)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </ScrollView>
      <AssetPreviewModal asset={selected} onClose={() => setSelected(null)} onChanged={() => void refresh()} />
    </ScreenFrame>
  );
}

function ImportCard({
  icon,
  title,
  detail,
  busy,
  pending,
  reduced,
  delay,
  onPress,
}: {
  icon: MediaIconName;
  title: string;
  detail: string;
  busy: boolean;
  pending: boolean;
  reduced: boolean;
  delay: number;
  onPress: () => void;
}) {
  const palette = usePalette();
  return (
    <Reveal delay={delay} reduced={reduced} style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${detail}`}
        disabled={busy}
        onPress={onPress}
        className="min-h-[132px] flex-1 rounded-[28px] border border-ink/10 bg-white px-4 py-4 disabled:opacity-60 dark:border-white/10 dark:bg-panel">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-foam dark:bg-ink">
          {pending ? <ActivityIndicator color={palette.icon} /> : <MediaIcon name={icon} color={palette.icon} />}
        </View>
        <Text className="mt-4 text-lg font-semibold text-ink dark:text-paper">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-mist dark:text-[#A39B90]">{detail}</Text>
      </Pressable>
    </Reveal>
  );
}
