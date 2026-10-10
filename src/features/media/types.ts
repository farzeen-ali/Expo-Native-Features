export type MediaKind = 'image' | 'video' | 'file';

export type StoredAsset = {
  id: string;
  name: string;
  uri: string;
  kind: MediaKind;
  mimeType: string | null;
  size: number | null;
  createdAt: number;
};

export type IncomingAsset = {
  uri: string;
  name: string;
  kind: MediaKind;
  mimeType?: string | null;
  size?: number | null;
};
