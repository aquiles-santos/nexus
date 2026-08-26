import {
  TOOLBAR_SEPARATOR,
  compactToolbarItems,
  resolveToolbarLayout,
} from '../shared/toolbar-layout.js';

export {
  TOOLBAR_SEPARATOR,
  compactToolbarItems,
  resolveToolbarLayout,
};

export const DEFAULT_EDITOR_HEIGHT = '100%';
export const DEFAULT_PLACEHOLDER = 'Comece a escrever…';

export const DEFAULT_TOOLBAR = [
  'undo',
  'redo',
  TOOLBAR_SEPARATOR,
  'formatBlock',
  TOOLBAR_SEPARATOR,
  'bold',
  'italic',
  'underline',
];

const HEIGHT_PATTERN =
  /^(?:auto|0|\d+(?:\.\d+)?(?:px|em|rem|vh|vw|vmin|vmax|%))$/i;

const ZERO_LENGTH_PATTERN = /^(?:0(?:\.0+)?(?:px|em|rem|vh|vw|vmin|vmax|%)?)$/i;

/**
 * @typedef {Object} NexusEditorConfigInput
 * @property {number | string} [height]
 * @property {string | string[]} [toolbar]
 * @property {string | false | null} [placeholder]
 */

/**
 * @typedef {Object} NexusEditorConfig
 * @property {string} height
 * @property {string[]} toolbar
 * @property {string | null} placeholder
 */

/**
 * @param {NexusEditorConfigInput} [input]
 * @returns {NexusEditorConfig}
 */
export function resolveEditorConfig(input = {}) {
  return {
    height: normalizeHeight(input.height),
    toolbar: normalizeToolbar(input.toolbar),
    placeholder: normalizePlaceholder(input.placeholder),
  };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeHeight(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return `${value}px`;
  }

  if (typeof value !== 'string') {
    return DEFAULT_EDITOR_HEIGHT;
  }

  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (numeric > 0) {
      return `${trimmed}px`;
    }
    return DEFAULT_EDITOR_HEIGHT;
  }

  if (HEIGHT_PATTERN.test(trimmed) && !ZERO_LENGTH_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return DEFAULT_EDITOR_HEIGHT;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeToolbar(value) {
  if (value === undefined || value === null) {
    return [...DEFAULT_TOOLBAR];
  }

  if (typeof value === 'string') {
    if (value.trim() === '') {
      return [...DEFAULT_TOOLBAR];
    }
    return compactToolbarItems(value.trim().split(/\s+/));
  }

  if (!Array.isArray(value)) {
    return [...DEFAULT_TOOLBAR];
  }

  const tokens = value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return compactToolbarItems(tokens);
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizePlaceholder(value) {
  if (value === false || value === null) {
    return null;
  }

  if (value === undefined) {
    return DEFAULT_PLACEHOLDER;
  }

  if (typeof value !== 'string') {
    return DEFAULT_PLACEHOLDER;
  }

  const trimmed = value.trim();
  return trimmed || null;
}
