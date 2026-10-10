export function formatBytes(size: number | null | undefined): string {
  if (size == null || size < 0) return 'Size unavailable';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatWhen(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || 'file';
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
  return `${Date.now()}-${cleaned || 'file'}`;
}

export function filenameFromUrl(url: URL): string {
  const last = url.pathname.split('/').filter(Boolean).pop();
  if (!last) return 'download.bin';
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}
