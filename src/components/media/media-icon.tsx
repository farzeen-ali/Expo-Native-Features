import { SymbolView } from 'expo-symbols';

const ICONS = {
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  photos: { ios: 'photo.fill', android: 'photo_library', web: 'photo_library' },
  files: { ios: 'folder.fill', android: 'folder', web: 'folder' },
  download: { ios: 'arrow.down.circle.fill', android: 'download', web: 'download' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  flip: { ios: 'arrow.triangle.2.circlepath', android: 'flip_camera_ios', web: 'flip_camera_ios' },
  flash: { ios: 'bolt.fill', android: 'flash_on', web: 'flash_on' },
  flashOff: { ios: 'bolt.slash', android: 'flash_off', web: 'flash_off' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
} as const;

export type MediaIconName = keyof typeof ICONS;

export function MediaIcon({
  name,
  color,
  size = 22,
}: {
  name: MediaIconName;
  color: string;
  size?: number;
}) {
  return <SymbolView name={ICONS[name]} tintColor={color} size={size} />;
}
