import { isAllowedTag, isBlock, getDefaultBlockTag, getInlineTag } from './schema.js';

const LIST_ITEM_FLOW_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'blockquote']);

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

  function rangeIntersectsNode(range, node) {
    if (typeof range.intersectsNode === 'function') {
      try {
        return range.intersectsNode(node);
      } catch {
        return false;
      }
    }

    const nodeRange = document.createRange();
    try {
      if (node.nodeType === Node.TEXT_NODE) {
        nodeRange.selectNodeContents(node);
      } else {
        nodeRange.selectNode(node);
      }
    } catch {
      return false;
    }

    return (
      range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0
      && nodeRange.compareBoundaryPoints(Range.START_TO_END, range) < 0
    );
  }

  function rangeContainsBlock(range) {
    const ancestor = range.commonAncestorContainer;
    if (ancestor.nodeType === Node.TEXT_NODE) {
      return false;
    }

    if (ancestor.nodeType === Node.ELEMENT_NODE) {
      const ancestorTag = ancestor.tagName.toLowerCase();
      if (ancestorTag === 'ul' || ancestorTag === 'ol') {
        return true;
      }
    }

    const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();

    while (node) {
      if (
        node.nodeType === Node.ELEMENT_NODE
        && isBlock(node.tagName.toLowerCase())
        && rangeIntersectsNode(range, node)
      ) {
        return true;
      }
      node = walker.nextNode();
    }

    return false;
  }

  function isWrappableTextNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.parentElement) {
      return false;
    }

    const parentTag = node.parentElement.tagName.toLowerCase();
    return parentTag !== 'ul' && parentTag !== 'ol';
  }

  function collectTextNodesInRange(range) {
    /** @type {Text[]} */
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (isWrappableTextNode(node) && rangeIntersectsNode(range, node)) {
        nodes.push(/** @type {Text} */ (node));
      }
      node = walker.nextNode();
    }

    return nodes;
  }

  function wrapTextNodesInRange(range, tag) {
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;

    /** @type {Text[]} */
    const pieces = [];

    for (const textNode of collectTextNodesInRange(range)) {
      let from = 0;
      let to = textNode.length;

      if (textNode === startContainer) {
        from = startOffset;
      }
      if (textNode === endContainer) {
        to = endOffset;
      }
      if (from >= to) {
        continue;
      }

      let piece = textNode;
      if (to < piece.length) {
        piece.splitText(to);
      }
      if (from > 0) {
        piece = piece.splitText(from);
      }
      if (piece.textContent) {
        pieces.push(piece);
      }
    }

    /** @type {HTMLElement | null} */
    let firstWrapper = null;
    /** @type {HTMLElement | null} */
    let lastWrapper = null;

    for (const piece of pieces) {
      const wrapper = document.createElement(tag);
      piece.parentNode?.insertBefore(wrapper, piece);
      wrapper.appendChild(piece);
      if (!firstWrapper) {
        firstWrapper = wrapper;
      }
      lastWrapper = wrapper;
    }

    if (!firstWrapper || !lastWrapper) {
      return;
    }

    const newRange = document.createRange();
    newRange.setStart(firstWrapper, 0);
    newRange.setEnd(lastWrapper, lastWrapper.childNodes.length);
    selection.setRange(newRange);
  }

  function wrapRangeWithTag(range, tag) {
    if (!rangeContainsBlock(range)) {
      const wrapper = document.createElement(tag);
      try {
        range.surroundContents(wrapper);
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.setRange(newRange);
        return;
      } catch {
        wrapTextNodesInRange(range, tag);
        return;
      }
    }

    wrapTextNodesInRange(range, tag);
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

  function isTextSliceMarked(tag, textNode, from, to) {
    if (from >= to) {
      return true;
    }

    return Boolean(findAncestorInlineFromNode(tag, textNode));
  }

  function isFullyMarked(tag, range) {
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;

    for (const textNode of collectTextNodesInRange(range)) {
      let from = 0;
      let to = textNode.length;

      if (textNode === startContainer) {
        from = startOffset;
      }
      if (textNode === endContainer) {
        to = endOffset;
      }
      if (from >= to) {
        continue;
      }

      if (!isTextSliceMarked(tag, textNode, from, to)) {
        return false;
      }
    }

    return true;
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

    if (isFullyMarked(tag, range)) {
      removeInlineTagsFromRange(tag, range);
      pendingMarks.delete(tag);
      return;
    }

    removeInlineTagsFromRange(tag, range);
    const refreshedRange = selection.getRange();
    if (refreshedRange) {
      wrapRangeWithTag(refreshedRange, tag);
    }
  }

  /**
   * @param {HTMLElement} listItem
   * @returns {HTMLElement}
   */
  function resolveListItemFlowBlock(listItem) {
    for (const child of listItem.children) {
      if (child instanceof HTMLElement && LIST_ITEM_FLOW_TAGS.has(child.tagName.toLowerCase())) {
        return child;
      }
    }

    const flowBlock = document.createElement(getDefaultBlockTag());
    let hasFlowContent = false;

    while (listItem.firstChild) {
      const node = listItem.firstChild;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = /** @type {HTMLElement} */ (node).tagName.toLowerCase();
        if (tag === 'ul' || tag === 'ol' || LIST_ITEM_FLOW_TAGS.has(tag)) {
          break;
        }
      }

      flowBlock.appendChild(node);
      hasFlowContent = true;
    }

    if (!hasFlowContent) {
      flowBlock.appendChild(document.createElement('br'));
      listItem.insertBefore(flowBlock, listItem.firstChild);
      return flowBlock;
    }

    listItem.insertBefore(flowBlock, listItem.firstChild);
    return flowBlock;
  }

  function formatBlock(blockTag) {
    if (!isAllowedTag(blockTag) || !isBlock(blockTag)) {
      return;
    }

    let block = findAncestorBlock();
    if (!block) {
      return;
    }

    if (block.tagName.toLowerCase() === 'li') {
      block = resolveListItemFlowBlock(block);
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
    if (!block) {
      return null;
    }

    if (block.tagName.toLowerCase() === 'li') {
      for (const child of block.children) {
        if (child instanceof HTMLElement && LIST_ITEM_FLOW_TAGS.has(child.tagName.toLowerCase())) {
          return child.tagName.toLowerCase();
        }
      }
      return getDefaultBlockTag();
    }

    return block.tagName.toLowerCase();
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

    if (range.collapsed) {
      if (selection.isWithin(tag)) {
        return true;
      }
      return pendingMarks.has(tag);
    }

    return isFullyMarked(tag, range);
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
