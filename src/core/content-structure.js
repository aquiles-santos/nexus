import { findAncestor } from './content-queries.js';
import { getDefaultBlockTag } from './schema.js';

const ROOT_BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol']);
const TEXT_CONTAINER_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'blockquote', 'li']);

/**
 * @param {Element} element
 * @returns {boolean}
 */
function isRootBlock(element) {
  return ROOT_BLOCK_TAGS.has(element.tagName.toLowerCase());
}

/**
 * @param {HTMLElement} paragraph
 */
function ensureParagraphPlaceholder(paragraph) {
  if (!paragraph.textContent.trim() && !paragraph.querySelector('img, br')) {
    paragraph.appendChild(document.createElement('br'));
  }
}

/**
 * @returns {HTMLParagraphElement}
 */
function createDefaultParagraph() {
  const paragraph = document.createElement(getDefaultBlockTag());
  paragraph.appendChild(document.createElement('br'));
  return paragraph;
}

/**
 * @param {HTMLElement} node
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 */
function setCaretAtStart(node, selection) {
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(true);
  selection.setRange(range);
}

/**
 * @param {HTMLParagraphElement} paragraph
 */
function removePlaceholderBreaks(paragraph) {
  if (!paragraph.textContent.trim()) {
    return;
  }

  for (const br of [...paragraph.children]) {
    if (br.tagName.toLowerCase() !== 'br') {
      continue;
    }

    const isLeading = !br.previousSibling;
    const isTrailing = !br.nextSibling;
    if (isLeading || isTrailing) {
      br.remove();
    }
  }
}

/**
 * @param {HTMLElement} root
 */
function normalizeEmptyParagraphs(root) {
  for (const paragraph of root.querySelectorAll('p')) {
    if (!paragraph.textContent.trim() && !paragraph.querySelector('img')) {
      ensureParagraphPlaceholder(paragraph);
      continue;
    }

    removePlaceholderBreaks(paragraph);
  }
}

/**
 * @param {HTMLElement} root
 */
function wrapRootOrphans(root) {
  /** @type {Node[]} */
  const orphans = [];

  for (const node of [...root.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim()) {
        orphans.push(node);
      } else {
        node.remove();
      }
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE && !isRootBlock(/** @type {Element} */ (node))) {
      orphans.push(node);
    }
  }

  if (orphans.length === 0) {
    return;
  }

  const paragraph = document.createElement(getDefaultBlockTag());
  root.insertBefore(paragraph, orphans[0]);
  for (const orphan of orphans) {
    paragraph.appendChild(orphan);
  }
  ensureParagraphPlaceholder(paragraph);
}

/**
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 * @param {Node} node
 * @returns {boolean}
 */
function isSelectionInsideNode(selection, node) {
  const range = selection?.getRange();
  if (!range) {
    return false;
  }

  return node.contains(range.startContainer);
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 * @returns {boolean}
 */
function hasValidTextContainer(root, selection) {
  const range = selection?.getRange();
  if (!range?.startContainer.isConnected) {
    return false;
  }

  if (range.startContainer === root) {
    return false;
  }

  if (
    range.startContainer.nodeType === Node.TEXT_NODE
    && range.startContainer.parentElement === root
  ) {
    return false;
  }

  return Boolean(
    findAncestor(root, range.startContainer, (element) =>
      TEXT_CONTAINER_TAGS.has(element.tagName.toLowerCase()),
    ),
  );
}

/**
 * @param {HTMLElement} root
 * @returns {HTMLParagraphElement | null}
 */
function findDefaultTypingParagraph(root) {
  for (const child of root.children) {
    if (
      child instanceof HTMLParagraphElement
      && isParagraphEmpty(child)
    ) {
      return child;
    }
  }

  const lastParagraph = root.querySelector(':scope > p:last-of-type');
  return lastParagraph instanceof HTMLParagraphElement ? lastParagraph : null;
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 */
function restoreCaretIfNeeded(root, selection) {
  if (!selection || hasValidTextContainer(root, selection)) {
    return;
  }

  let paragraph = findDefaultTypingParagraph(root);
  if (!paragraph) {
    paragraph = createDefaultParagraph();
    root.appendChild(paragraph);
  } else {
    ensureParagraphPlaceholder(paragraph);
  }

  setCaretAtStart(paragraph, selection);
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 */
function collapseConsecutiveEmptyParagraphs(root, selection) {
  let previousWasEmpty = false;
  /** @type {HTMLParagraphElement | null} */
  let previousParagraph = null;

  for (const child of [...root.children]) {
    if (!(child instanceof HTMLParagraphElement)) {
      previousWasEmpty = false;
      previousParagraph = null;
      continue;
    }

    if (isParagraphEmpty(child) && previousWasEmpty) {
      if (isSelectionInsideNode(selection, child) && previousParagraph) {
        setCaretAtStart(previousParagraph, selection);
      }
      child.remove();
      continue;
    }

    previousWasEmpty = isParagraphEmpty(child);
    previousParagraph = child;
  }
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 */
export function ensureEditableStructure(root, selection) {
  normalizeEmptyParagraphs(root);

  if (!root.hasChildNodes()) {
    const paragraph = createDefaultParagraph();
    root.appendChild(paragraph);
    setCaretAtStart(paragraph, selection);
    return;
  }

  wrapRootOrphans(root);

  const hasRootBlock = [...root.children].some(
    (child) => child instanceof HTMLElement && isRootBlock(child),
  );
  if (!hasRootBlock) {
    const paragraph = createDefaultParagraph();
    root.appendChild(paragraph);
    setCaretAtStart(paragraph, selection);
  }

  collapseConsecutiveEmptyParagraphs(root, selection);
  restoreCaretIfNeeded(root, selection);
}

/**
 * @param {HTMLElement} root
 * @param {Node} node
 * @returns {HTMLParagraphElement | null}
 */
function findAncestorParagraph(root, node) {
  return findAncestor(root, node, (element) => element.tagName.toLowerCase() === 'p');
}

/**
 * @param {HTMLParagraphElement} paragraph
 * @returns {boolean}
 */
function isParagraphEmpty(paragraph) {
  if (paragraph.querySelector('img')) {
    return false;
  }

  return !paragraph.textContent.trim();
}

/**
 * @param {HTMLImageElement} image
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 */
export function ensureParagraphAfterImage(image, selection) {
  const root = image.parentElement;
  if (!root) {
    return;
  }

  const hostParagraph =
    image.parentElement?.tagName.toLowerCase() === 'p' ? image.parentElement : null;

  if (hostParagraph) {
    const next = hostParagraph.nextElementSibling;
    if (next instanceof HTMLElement && next.tagName.toLowerCase() === 'p') {
      ensureParagraphPlaceholder(next);
      setCaretAtStart(next, selection);
      return;
    }

    const trailing = createDefaultParagraph();
    hostParagraph.insertAdjacentElement('afterend', trailing);
    setCaretAtStart(trailing, selection);
    return;
  }

  if (image.parentElement) {
    const wrapper = document.createElement(getDefaultBlockTag());
    image.parentElement.insertBefore(wrapper, image);
    wrapper.appendChild(image);
  }

  const trailing = createDefaultParagraph();
  image.parentElement?.insertAdjacentElement('afterend', trailing);
  setCaretAtStart(trailing, selection);
}

/**
 * @param {HTMLImageElement} image
 * @param {Range} range
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager> | null | undefined} selection
 */
export function insertImageWithStructure(image, range, root, selection) {
  const hostParagraph = findAncestorParagraph(root, range.startContainer);

  if (hostParagraph && isParagraphEmpty(hostParagraph)) {
    hostParagraph.replaceChildren(image);
  } else {
    range.insertNode(image);
    if (image.parentElement === root) {
      const wrapper = document.createElement(getDefaultBlockTag());
      root.insertBefore(wrapper, image);
      wrapper.appendChild(image);
    }
  }

  ensureParagraphAfterImage(image, selection);
  ensureEditableStructure(root, selection);
}
