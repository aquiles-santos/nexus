import { describe, it, expect } from 'vitest';
import { createLocalStorageAdapter, DEFAULT_MAX_IMAGE_BYTES } from './storage-adapter.js';

describe('createLocalStorageAdapter', () => {
  it('rejects non-image files', async () => {
    const adapter = createLocalStorageAdapter();
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    await expect(adapter.upload(file)).rejects.toThrow(/image/i);
  });

  it('rejects files above the size limit', async () => {
    const adapter = createLocalStorageAdapter({ maxBytes: 8 });
    const file = new File([new Uint8Array(16)], 'photo.png', { type: 'image/png' });

    await expect(adapter.upload(file)).rejects.toThrow(/smaller/i);
  });

  it('returns a blob url for valid images', async () => {
    const adapter = createLocalStorageAdapter({ maxBytes: DEFAULT_MAX_IMAGE_BYTES });
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', {
      type: 'image/png',
    });

    const url = await adapter.upload(file);
    expect(url.startsWith('blob:')).toBe(true);
  });

  it('rejects svg files even when labelled as images', async () => {
    const adapter = createLocalStorageAdapter();
    const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });

    await expect(adapter.upload(file)).rejects.toThrow(/png|jpeg|gif|webp/i);
  });
});
