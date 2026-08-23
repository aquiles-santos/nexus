import { isAllowedTag, isBlock, getDefaultBlockTag, getInlineTag } from './schema.js';

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager>} selection
 */
export function createFormatter(root, selection) {
  /** @type {Set<string>} */
  const pendingMarks = new Set();

  function findAncestorBlock(tag) {
    const range = selection.getRange();
    if (!range) {
      return null;
    }

    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node !== root) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const nodeTag = node.tagName.toLowerCase();
        if (isBlock(nodeTag) && (!tag || nodeTag === tag)) {
          return /** @type {HTMLElement} */ (node);
        }
      }
      node = node.parentNode;
    }

    return null;
  }

  function findAncestorInlineFromNode(tag, node) {
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    while (node && node !== root) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === tag) {
        return /** @type {HTMLElement} */ (node);
      }
      node = node.parentNode;
    }

    return null;
  }

  function findInlineInRange(tag, range) {
    const fromStart = findAncestorInlineFromNode(tag, range.startContainer);
    if (fromStart) {
      return fromStart;
    }

    const fromEnd = findAncestorInlineFromNode(tag, range.endContainer);
    if (fromEnd) {
      return fromEnd;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();

    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE
        && node.tagName.toLowerCase() === tag
        && range.intersectsNode(node)) {
        return /** @type {HTMLElement} */ (node);
      }
      node = walker.nextNode();
    }

    return null;
  }

  function selectTextInRoot(text) {
    if (!text) {
      return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      const textNode = /** @type {Text} */ (node);
      const index = textNode.textContent.indexOf(text);
      if (index !== -1) {
        const newRange = document.createRange();
        newRange.setStart(textNode, index);
        newRange.setEnd(textNode, index + text.length);
        selection.setRange(newRange);
        return;
      }
      node = walker.nextNode();
    }
  }

  function removeInlineTagsFromRange(tag, range) {
    const selectedText = range.toString();

    /** @type {HTMLElement[]} */
    const elements = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();

    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE
        && node.tagName.toLowerCase() === tag
        && range.intersectsNode(node)) {
        elements.push(/** @type {HTMLElement} */ (node));
      }
      node = walker.nextNode();
    }

    for (const element of elements.reverse()) {
      unwrapElement(element);
    }

    selectTextInRoot(selectedText);
  }

  function unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) {
      return;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
  }

  function wrapRangeWithTag(range, tag) {
    const wrapper = document.createElement(tag);

    try {
      range.surroundContents(wrapper);
    } catch {
      const contents = range.extractContents();
      wrapper.appendChild(contents);
      range.insertNode(wrapper);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    selection.setRange(newRange);
  }

  function exitInlineAtCursor(inlineElement, range) {
    const parent = inlineElement.parentNode;
    if (!parent) {
      return;
    }

    const textLength = inlineElement.textContent?.length ?? 0;
    const offset = range.startOffset;

    if (inlineElement.firstChild?.nodeType === Node.TEXT_NODE && offset > 0 && offset < textLength) {
      const textNode = /** @type {Text} */ (inlineElement.firstChild);
      const afterText = textNode.splitText(offset);
      parent.insertBefore(afterText, inlineElement.nextSibling);
    } else if (offset >= textLength) {
      parent.insertBefore(document.createTextNode(''), inlineElement.nextSibling);
    }

    pendingMarks.delete(inlineElement.tagName.toLowerCase());

    const newRange = document.createRange();
    const nextNode = inlineElement.nextSibling;
    if (nextNode?.nodeType === Node.TEXT_NODE) {
      newRange.setStart(nextNode, 0);
    } else {
      newRange.setStartAfter(inlineElement);
    }
    newRange.collapse(true);
    selection.setRange(newRange);
  }

  function toggleInline(tag) {
    const range = selection.getRange();
    if (!range) {
      return;
    }

    if (range.collapsed) {
      const existing = findAncestorInlineFromNode(tag, range.startContainer);
      if (existing) {
        exitInlineAtCursor(existing, range);
        return;
      }

      if (pendingMarks.has(tag)) {
        pendingMarks.delete(tag);
      } else {
        pendingMarks.add(tag);
      }
      return;
    }

    const existing = findInlineInRange(tag, range);
    if (existing) {
      removeInlineTagsFromRange(tag, range);
      pendingMarks.delete(tag);
      return;
    }

    wrapRangeWithTag(range, tag);
  }

  function formatBlock(blockTag) {
    if (!isAllowedTag(blockTag) || !isBlock(blockTag)) {
      return;
    }

    const block = findAncestorBlock();
    if (!block) {
      return;
    }

    const currentTag = block.tagName.toLowerCase();
    const targetTag = currentTag === blockTag ? getDefaultBlockTag() : blockTag;
    const replacement = document.createElement(targetTag);

    while (block.firstChild) {
      replacement.appendChild(block.firstChild);
    }

    block.replaceWith(replacement);

    const range = document.createRange();
    range.selectNodeContents(replacement);
    range.collapse(true);
    selection.setRange(range);
  }

  function applyPendingMarks(textNode) {
    let node = textNode;

    for (const tag of pendingMarks) {
      const wrapper = document.createElement(tag);
      textNode.parentNode.insertBefore(wrapper, textNode);
      wrapper.appendChild(textNode);
      node = wrapper;
    }

    pendingMarks.clear();
    return node;
  }

  function hasPendingMark(command) {
    const tag = getInlineTag(command);
    return tag ? pendingMarks.has(tag) : false;
  }

  function getActiveBlockTag() {
    const block = findAncestorBlock();
    return block ? block.tagName.toLowerCase() : null;
  }

  function isActive(command) {
    const tag = getInlineTag(command);
    if (!tag) {
      return false;
    }

    const range = selection.getRange();
    if (!range) {
      return false;
    }

    if (selection.isWithin(tag)) {
      return true;
    }

    return Boolean(range.collapsed && pendingMarks.has(tag));
  }

  return {
    toggleInline,
    formatBlock,
    applyPendingMarks,
    hasPendingMark,
    isActive,
    getActiveBlockTag,
    getPendingMarks: () => new Set(pendingMarks),
    clearPendingMarks: () => pendingMarks.clear(),
  };
}
