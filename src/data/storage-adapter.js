export const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export const ALLOWED_IMAGE_ACCEPT = [...ALLOWED_IMAGE_TYPES].join(',');

/**
 * @typedef {Object} StorageAdapter
 * @property {(file: File) => Promise<string>} upload
 * @property {(url: string) => Promise<void>} [remove]
 */

/**
 * @param {{ maxBytes?: number }} [options]
 * @returns {StorageAdapter}
 */
export function createLocalStorageAdapter({ maxBytes = DEFAULT_MAX_IMAGE_BYTES } = {}) {
  /** @type {Set<string>} */
  const objectUrls = new Set();

  return {
    async upload(file) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        throw new Error('Only PNG, JPEG, GIF, and WebP images are supported.');
      }

      if (file.size > maxBytes) {
        throw new Error(`Image must be smaller than ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      }

      const url =
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : `blob:local/${objectUrls.size + 1}`;
      objectUrls.add(url);
      return url;
    },

    async remove(url) {
      if (objectUrls.has(url)) {
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
        objectUrls.delete(url);
      }
    },
  };
}
