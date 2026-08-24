export const TOOLBAR_SEPARATOR = '|';

/**
 * @param {string[]} items
 * @returns {string[]}
 */
export function compactToolbarItems(items) {
  const compacted = [];

  for (const item of items) {
    if (item === TOOLBAR_SEPARATOR) {
      if (
        compacted.length === 0 ||
        compacted[compacted.length - 1] === TOOLBAR_SEPARATOR
      ) {
        continue;
      }
      compacted.push(TOOLBAR_SEPARATOR);
      continue;
    }
    compacted.push(item);
  }

  if (compacted[compacted.length - 1] === TOOLBAR_SEPARATOR) {
    compacted.pop();
  }

  return compacted;
}

/**
 * @param {string[]} requested
 * @param {Set<string> | string[]} available
 * @returns {string[]}
 */
export function resolveToolbarLayout(requested, available) {
  const availableSet =
    available instanceof Set ? available : new Set(available);

  const visible = requested.filter(
    (id) => id === TOOLBAR_SEPARATOR || availableSet.has(id),
  );

  return compactToolbarItems(visible);
}
