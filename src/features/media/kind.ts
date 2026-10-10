import type { MediaKind } from '@/features/media/types';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i;

export function inferKind(name: string, mimeType: string | null | undefined): MediaKind {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/') || IMAGE_EXT.test(name)) return 'image';
  if (mime.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
  return 'file';
}

export function kindLabel(kind: MediaKind): string {
  if (kind === 'image') return 'Photo';
  if (kind === 'video') return 'Video';
  return 'File';
}
