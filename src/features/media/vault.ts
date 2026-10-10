import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { MediaError } from '@/features/media/errors';
import { filenameFromUrl, safeFileName } from '@/features/media/format';
import { inferKind } from '@/features/media/kind';
import type { IncomingAsset, MediaKind, StoredAsset } from '@/features/media/types';

const VAULT_DIRECTORY = 'lumen-vault';
const MANIFEST_NAME = 'index.json';
const SESSION_LIMIT = 40;

export const SAMPLE_DOWNLOAD_URL = 'https://pdfobject.com/pdf/sample.pdf';

const sessionAssets: StoredAsset[] = [];

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function supportsLocalFiles(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return typeof Paths.document?.uri === 'string' && Paths.document.uri.length > 0;
  } catch {
    return false;
  }
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isStoredAsset(value: unknown): value is StoredAsset {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const kind = item.kind;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.uri === 'string' &&
    (kind === 'image' || kind === 'video' || kind === 'file') &&
    (item.mimeType === null || typeof item.mimeType === 'string') &&
    (item.size === null || typeof item.size === 'number') &&
    typeof item.createdAt === 'number'
  );
}

function ensureVaultDirectory(): Directory {
  const directory = new Directory(Paths.document, VAULT_DIRECTORY);
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

function manifestFile(): File {
  return new File(ensureVaultDirectory(), MANIFEST_NAME);
}

async function readManifest(): Promise<StoredAsset[]> {
  const file = manifestFile();
  if (!file.exists) return [];
  try {
    const parsed = JSON.parse(await file.text()) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredAsset);
  } catch {
    return [];
  }
}

function writeManifest(assets: StoredAsset[]) {
  const file = manifestFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify(assets));
}

function remember(incoming: IncomingAsset): StoredAsset {
  const asset: StoredAsset = {
    id: createId(),
    name: incoming.name,
    uri: incoming.uri,
    kind: incoming.kind,
    mimeType: incoming.mimeType ?? null,
    size: incoming.size ?? null,
    createdAt: Date.now(),
  };
  sessionAssets.unshift(asset);
  if (sessionAssets.length > SESSION_LIMIT) sessionAssets.pop();
  return asset;
}

function assetFromFile(file: File, kind: MediaKind, fallbackMime: string | null, fallbackSize: number | null): StoredAsset {
  return {
    id: createId(),
    name: file.name,
    uri: file.uri,
    kind,
    mimeType: file.type || fallbackMime,
    size: file.exists ? file.size : fallbackSize,
    createdAt: Date.now(),
  };
}

async function copyIntoVault(incoming: IncomingAsset): Promise<StoredAsset> {
  const destination = new File(ensureVaultDirectory(), safeFileName(incoming.name));
  try {
    await new File(incoming.uri).copy(destination);
  } catch (error) {
    if (destination.exists) destination.delete();
    throw new MediaError(
      error instanceof Error && error.message
        ? `Could not store the file. ${error.message}`
        : 'Could not store the file on this device.',
      'failed',
    );
  }
  return assetFromFile(destination, incoming.kind, incoming.mimeType ?? null, incoming.size ?? null);
}

export function listStoredAssets(): Promise<StoredAsset[]> {
  return enqueue(async () => {
    if (!supportsLocalFiles()) {
      return [...sessionAssets].sort((a, b) => b.createdAt - a.createdAt);
    }
    const assets = await readManifest();
    const existing = assets.filter((item) => {
      try {
        return new File(item.uri).exists;
      } catch {
        return false;
      }
    });
    if (existing.length !== assets.length) writeManifest(existing);
    return existing.sort((a, b) => b.createdAt - a.createdAt);
  });
}

export function saveIncomingAssets(items: IncomingAsset[]): Promise<StoredAsset[]> {
  return enqueue(async () => {
    if (items.length === 0) return [];
    if (!supportsLocalFiles()) return items.map(remember);

    const saved: StoredAsset[] = [];
    try {
      for (const item of items) {
        saved.push(await copyIntoVault(item));
      }
      return saved;
    } catch (error) {
      if (saved.length === 0) {
        throw error instanceof MediaError ? error : new MediaError('Could not store the file.', 'failed');
      }
      const reason = error instanceof Error ? error.message : 'Could not store every file.';
      throw new MediaError(`${reason} ${saved.length} saved before the failure.`, 'failed');
    } finally {
      if (saved.length > 0) {
        const existing = await readManifest();
        writeManifest([...saved].reverse().concat(existing));
      }
    }
  });
}

export function downloadIntoVault(
  url: string,
  onProgress?: (ratio: number | null) => void,
): Promise<StoredAsset> {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return Promise.reject(new MediaError('Enter a full URL, including https://.', 'failed'));
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return Promise.reject(new MediaError('Only http and https downloads are supported.', 'failed'));
  }
  if (!supportsLocalFiles()) {
    return Promise.reject(
      new MediaError(
        'Downloads are saved on a device. This browser preview cannot write local files.',
        'unavailable',
      ),
    );
  }

  return enqueue(async () => {
    const destination = new File(ensureVaultDirectory(), safeFileName(filenameFromUrl(parsed)));
    onProgress?.(null);
    try {
      const file = await File.downloadFileAsync(trimmed, destination, {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) => {
          onProgress?.(totalBytes > 0 ? bytesWritten / totalBytes : null);
        },
      });
      const asset = assetFromFile(file, inferKind(file.name, file.type), null, file.size);
      const existing = await readManifest();
      writeManifest([asset, ...existing]);
      onProgress?.(1);
      return asset;
    } catch (error) {
      if (destination.exists) destination.delete();
      throw new MediaError(
        error instanceof MediaError
          ? error.message
          : error instanceof Error && error.message
            ? `Download failed. ${error.message}`
            : 'Download failed. Check the URL and try again.',
        'failed',
      );
    }
  });
}

export function deleteStoredAsset(id: string): Promise<void> {
  return enqueue(async () => {
    if (!supportsLocalFiles()) {
      const index = sessionAssets.findIndex((item) => item.id === id);
      if (index >= 0) sessionAssets.splice(index, 1);
      return;
    }
    const assets = await readManifest();
    const target = assets.find((item) => item.id === id);
    if (!target) return;
    const file = new File(target.uri);
    if (file.exists) file.delete();
    writeManifest(assets.filter((item) => item.id !== id));
  });
}
