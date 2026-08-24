/**
 * @param {HTMLElement} root
 * @param {Node} node
 * @param {(element: Element) => boolean} predicate
 * @returns {HTMLElement | null}
 */
export function findAncestor(root, node, predicate) {
  let current = node;
  if (current.nodeType === Node.TEXT_NODE) {
    current = current.parentNode;
  }

  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE && predicate(/** @type {Element} */ (current))) {
      return /** @type {HTMLElement} */ (current);
    }
    current = current.parentNode;
  }

  return null;
}

/**
 * @param {HTMLElement} root
 * @param {Node} node
 * @returns {HTMLAnchorElement | null}
 */
export function findAncestorAnchor(root, node) {
  return /** @type {HTMLAnchorElement | null} */ (
    findAncestor(root, node, (element) => element.tagName.toLowerCase() === 'a')
  );
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager>} selection
 * @returns {'ul' | 'ol' | null}
 */
export function getActiveListType(root, selection) {
  const range = selection.getRange();
  if (!range) {
    return null;
  }

  const list = findAncestor(root, range.startContainer, (element) => {
    const tag = element.tagName.toLowerCase();
    return tag === 'ul' || tag === 'ol';
  });

  if (!list) {
    return null;
  }

  return /** @type {'ul' | 'ol'} */ (list.tagName.toLowerCase());
}
