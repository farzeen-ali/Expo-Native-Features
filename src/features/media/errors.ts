export type MediaErrorCode = 'permission' | 'unavailable' | 'cancelled' | 'failed';

export class MediaError extends Error {
  readonly code: MediaErrorCode;
  readonly canAskAgain: boolean;

  constructor(message: string, code: MediaErrorCode, canAskAgain = true) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
    this.canAskAgain = canAskAgain;
  }
}

export function toMediaError(error: unknown, fallback: string): MediaError {
  if (error instanceof MediaError) return error;
  if (error instanceof Error && error.message.trim()) {
    return new MediaError(error.message, 'failed');
  }
  return new MediaError(fallback, 'failed');
}
