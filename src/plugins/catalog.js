import { pluginBasicFormats } from './basic-formats/index.js';
import { pluginLists } from './lists/index.js';
import { pluginLink } from './link/index.js';
import { pluginMedia } from './media/index.js';
import { pluginPasteClean } from './paste-clean/index.js';
import { pluginSourceCode } from './source-code/index.js';

/**
 * @typedef {import('../shared/plugin-registry.js').NexusPlugin} NexusPlugin
 */

/** @type {Readonly<Record<string, NexusPlugin>>} */
export const PLUGIN_CATALOG = Object.freeze({
  'basic-formats': pluginBasicFormats,
  lists: pluginLists,
  link: pluginLink,
  media: pluginMedia,
  'paste-clean': pluginPasteClean,
  'source-code': pluginSourceCode,
});

/**
 * @param {unknown} value
 * @returns {value is NexusPlugin}
 */
function isPluginObject(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof /** @type {NexusPlugin} */ (value).name === 'string' &&
      typeof /** @type {NexusPlugin} */ (value).init === 'function',
  );
}

/**
 * Resolves catalog names and/or plugin objects into plugin instances.
 * Unknown names throw. Duplicate names (and objects with the same `name`) are skipped.
 *
 * @param {string | Array<string | NexusPlugin>} [input]
 * @returns {NexusPlugin[]}
 */
export function resolvePlugins(input) {
  if (input === undefined || input === null) {
    return [];
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return [];
    }
    return resolvePluginTokens(trimmed.split(/\s+/));
  }

  if (!Array.isArray(input)) {
    throw new Error(
      'plugins must be a string, an array of names, or a mixed array of names and plugin objects',
    );
  }

  return resolvePluginTokens(input);
}

/**
 * @param {Array<unknown>} tokens
 * @returns {NexusPlugin[]}
 */
function resolvePluginTokens(tokens) {
  const resolved = [];
  const seen = new Set();

  for (const token of tokens) {
    if (isPluginObject(token)) {
      if (seen.has(token.name)) {
        continue;
      }
      seen.add(token.name);
      resolved.push(token);
      continue;
    }

    if (typeof token !== 'string') {
      throw new Error(
        'plugins array items must be catalog names or plugin objects',
      );
    }

    const name = token.trim();
    if (!name) {
      continue;
    }

    if (seen.has(name)) {
      continue;
    }

    const plugin = PLUGIN_CATALOG[name];
    if (!plugin) {
      throw new Error(`Unknown plugin "${name}"`);
    }

    seen.add(name);
    resolved.push(plugin);
  }

  return resolved;
}
