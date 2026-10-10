import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType, type FlashMode } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';

import { MediaIcon } from '@/components/media/media-icon';
import { StatusBanner } from '@/components/media/status-banner';
import { MediaError, toMediaError } from '@/features/media/errors';
import { openSystemSettings } from '@/features/media/settings';
import { saveIncomingAssets } from '@/features/media/vault';
import { usePalette } from '@/hooks/use-palette';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const FLASH_MODES: FlashMode[] = ['off', 'on', 'auto'];
const VIDEO_AVAILABLE = Platform.OS !== 'web';

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const reduced = useReducedMotion();
  const cameraRef = useRef<CameraView>(null);
  const mounted = useRef(true);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [mode, setMode] = useState<'picture' | 'video'>('picture');
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'saving'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [banner, setBanner] = useState<MediaError | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // The preview mounts after this effect, so cleanup has to read the latest camera.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      cameraRef.current?.stopRecording();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  async function takePhoto() {
    const camera = cameraRef.current;
    if (!camera || !ready || phase !== 'idle') return;
    setPhase('saving');
    setBanner(null);
    try {
      const picture = await camera.takePictureAsync({ quality: 0.85 });
      if (!picture?.uri) throw new MediaError('The camera did not return a photo.', 'failed');
      await saveIncomingAssets([
        {
          uri: picture.uri,
          name: `frame-${Date.now()}.jpg`,
          kind: 'image',
          mimeType: 'image/jpeg',
        },
      ]);
      if (mounted.current) router.back();
    } catch (error) {
      if (!mounted.current) return;
      setBanner(toMediaError(error, 'Could not save the photo.'));
      setPhase('idle');
    }
  }

  async function startRecording() {
    const camera = cameraRef.current;
    if (!camera || !ready || phase !== 'idle') return;
    if (!VIDEO_AVAILABLE) {
      setBanner(new MediaError('Video recording is available on a device.', 'unavailable'));
      return;
    }
    setElapsed(0);
    setPhase('recording');
    setBanner(null);
    try {
      const video = await camera.recordAsync({ maxDuration: 60 });
      if (!video?.uri) throw new MediaError('The camera did not return a video.', 'failed');
      if (mounted.current) {
        setElapsed(0);
        setPhase('saving');
      }
      await saveIncomingAssets([
        {
          uri: video.uri,
          name: `clip-${Date.now()}.mp4`,
          kind: 'video',
          mimeType: 'video/mp4',
        },
      ]);
      if (mounted.current) router.back();
    } catch (error) {
      if (!mounted.current) return;
      setBanner(toMediaError(error, 'Could not record video.'));
      setElapsed(0);
      setPhase('idle');
    }
  }

  function onShutter() {
    if (mode === 'video') {
      if (phase === 'recording') {
        cameraRef.current?.stopRecording();
        return;
      }
      void startRecording();
      return;
    }
    void takePhoto();
  }

  function close() {
    if (phase === 'recording') cameraRef.current?.stopRecording();
    router.back();
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <StatusBar style="light" />
        <ActivityIndicator color="#C6A15A" />
        <Text className="mt-4 text-base text-paper">Checking camera access</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <View className="flex-1 bg-paper px-6 dark:bg-ink" style={{ paddingTop: insets.top + 12 }}>
        <StatusBar style="auto" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          onPress={() => router.back()}
          className="min-h-12 min-w-12 items-center justify-center self-start rounded-full bg-foam dark:bg-panel">
          <MediaIcon name="close" color={palette.icon} size={18} />
        </Pressable>
        <View className="flex-1 justify-center">
          <Text className="text-xs font-semibold uppercase tracking-widest text-mist dark:text-[#A39B90]">
            Camera
          </Text>
          <Text accessibilityRole="header" className="mt-3 text-4xl font-semibold text-ink dark:text-paper">
            Allow the lens
          </Text>
          <Text className="mt-4 text-base leading-6 text-mist dark:text-[#A39B90]">
            Photos and video stay on this device until you share them. Microphone access is only used
            while recording, and you can skip it.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (blocked) void openSystemSettings();
              else void requestPermission();
            }}
            className="mt-8 min-h-12 items-center justify-center rounded-full bg-brass px-6">
            <Text className="text-base font-semibold text-brassInk">
              {blocked ? 'Open Settings' : 'Allow camera'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const shutterLabel =
    mode === 'picture' ? 'Take photo' : phase === 'recording' ? 'Stop recording' : 'Start recording';
  const silentVideo = mode === 'video' && micPermission && !micPermission.granted;

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode={mode}
        mute={mode === 'video' && !micPermission?.granted}
        mirror={facing === 'front'}
        active
        onCameraReady={() => setReady(true)}
        onMountError={(event) => setMountError(event.message)}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
          pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            onPress={close}
            className="min-h-12 min-w-12 items-center justify-center rounded-full bg-black/50">
            <MediaIcon name="close" color="#F3EEE6" size={18} />
          </Pressable>
          {phase === 'recording' ? (
            <Text accessibilityLiveRegion="polite" className="text-base font-semibold text-white">
              {formatClock(elapsed)}
            </Text>
          ) : (
            <View className="min-w-12" />
          )}
          {mode === 'picture' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Flash ${flash}`}
              onPress={() =>
                setFlash((current) => FLASH_MODES[(FLASH_MODES.indexOf(current) + 1) % FLASH_MODES.length] ?? 'off')
              }
              className="min-h-12 min-w-12 items-center justify-center rounded-full bg-black/50">
              <MediaIcon name={flash === 'off' ? 'flashOff' : 'flash'} color="#F3EEE6" size={18} />
            </Pressable>
          ) : (
            <View className="min-w-12" />
          )}
        </View>

        <View className="flex-1 justify-end px-5" style={{ paddingBottom: insets.bottom + 20 }} pointerEvents="box-none">
          {mountError ? (
            <StatusBanner tone="error" message={mountError} onDismiss={() => setMountError(null)} />
          ) : null}
          {banner ? (
            <View className="mt-3">
              <StatusBanner tone="error" message={banner.message} onDismiss={() => setBanner(null)} />
            </View>
          ) : null}
          {silentVideo ? (
            <View className="mt-3 rounded-2xl bg-black/60 px-4 py-3">
              <Text className="text-sm leading-5 text-white">
                Microphone access is off, so this video will be silent.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (micPermission && !micPermission.canAskAgain) void openSystemSettings();
                  else void requestMicPermission();
                }}
                className="mt-3 min-h-12 items-center justify-center self-start rounded-full bg-white px-4">
                <Text className="text-sm font-semibold text-ink">
                  {micPermission && !micPermission.canAskAgain ? 'Open Settings' : 'Allow microphone'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View className="mt-4 flex-row items-center justify-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'picture' }}
              disabled={phase !== 'idle'}
              onPress={() => setMode('picture')}
              className={`min-h-12 items-center justify-center rounded-full px-5 ${mode === 'picture' ? 'bg-white' : 'bg-black/40'}`}>
              <Text className={`text-sm font-semibold ${mode === 'picture' ? 'text-ink' : 'text-white'}`}>Photo</Text>
            </Pressable>
            {VIDEO_AVAILABLE ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'video' }}
                disabled={phase !== 'idle'}
                onPress={() => {
                  setMode('video');
                  if (!micPermission?.granted) void requestMicPermission();
                }}
                className={`min-h-12 items-center justify-center rounded-full px-5 ${mode === 'video' ? 'bg-white' : 'bg-black/40'}`}>
                <Text className={`text-sm font-semibold ${mode === 'video' ? 'text-ink' : 'text-white'}`}>
                  Video
                </Text>
              </Pressable>
            ) : (
              <Text className="text-sm text-white">Video needs a device</Text>
            )}
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <View className="w-12" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shutterLabel}
              disabled={!ready || phase === 'saving'}
              onPress={onShutter}
              className="h-20 w-20 items-center justify-center rounded-full border-4 border-white disabled:opacity-40">
              <MotiView
                animate={{ scale: phase === 'recording' && !reduced ? 0.62 : 1 }}
                transition={{ type: 'timing', duration: reduced ? 0 : 180 }}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: phase === 'recording' ? 12 : 29,
                  backgroundColor: mode === 'video' ? '#E15A4A' : '#F3EEE6',
                }}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Flip camera"
              disabled={phase !== 'idle'}
              onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
              className="min-h-12 min-w-12 items-center justify-center rounded-full bg-black/50 disabled:opacity-40">
              <MediaIcon name="flip" color="#F3EEE6" size={20} />
            </Pressable>
          </View>
          {phase === 'saving' ? (
            <View className="mt-4 flex-row items-center justify-center gap-2">
              <ActivityIndicator color="#F3EEE6" />
              <Text className="text-base text-white">Saving</Text>
            </View>
          ) : (
            <Text className="mt-4 text-center text-sm text-white/80">
              {mode === 'video' ? 'Hold a clip up to 60 seconds' : 'Photos are stored in the vault'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
