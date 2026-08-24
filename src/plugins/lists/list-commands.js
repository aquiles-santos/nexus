import { findAncestor } from '../../core/content-queries.js';

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'blockquote', 'li']);
const LIST_ITEM_FLOW_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'blockquote']);

/**
 * @param {HTMLElement} root
 * @param {Range} range
 * @returns {HTMLElement[]}
 */
export function getBlocksInRange(root, range) {
  /** @type {HTMLElement[]} */
  const blocks = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();

  while (node) {
    if (
      node.nodeType === Node.ELEMENT_NODE
      && BLOCK_TAGS.has(node.tagName.toLowerCase())
      && range.intersectsNode(node)
    ) {
      blocks.push(/** @type {HTMLElement} */ (node));
    }
    node = walker.nextNode();
  }

  if (blocks.length === 0) {
    const block = findAncestor(root, range.startContainer, (element) =>
      BLOCK_TAGS.has(element.tagName.toLowerCase()),
    );
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('../../core/selection.js').createSelectionManager>} selection
 * @returns {HTMLElement | null}
 */
export function getActiveListItem(root, selection) {
  const range = selection.getRange();
  if (!range) {
    return null;
  }

  return findAncestor(root, range.startContainer, (element) =>
    element.tagName.toLowerCase() === 'li',
  );
}

/**
 * @param {Node | null | undefined} node
 * @returns {node is HTMLElement}
 */
function isListElement(node) {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  const tag = node.tagName.toLowerCase();
  return tag === 'ul' || tag === 'ol';
}

/**
 * @param {HTMLElement} element
 * @returns {HTMLElement | null}
 */
function getEnclosingList(element) {
  let current = element.parentElement;
  while (current) {
    if (isListElement(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * @param {HTMLElement[]} blocks
 * @returns {HTMLElement[]}
 */
function getOutermostBlocks(blocks) {
  return blocks.filter(
    (block) => !blocks.some((other) => other !== block && other.contains(block)),
  );
}

/**
 * @param {HTMLElement[]} blocks
 * @returns {HTMLElement[]}
 */
function getInnermostBlocks(blocks) {
  return blocks.filter(
    (block) => !blocks.some((other) => other !== block && block.contains(other)),
  );
}

/**
 * @param {HTMLElement[]} blocks
 * @returns {boolean}
 */
function shareSameParentList(blocks) {
  if (blocks.length === 0) {
    return false;
  }

  const parent = blocks[0].parentElement;
  if (!isListElement(parent)) {
    return false;
  }

  return blocks.every(
    (block) =>
      block.tagName.toLowerCase() === 'li' && block.parentElement === parent,
  );
}

/**
 * Prefer the list that actually contains the caret/selection so a nested
 * item can change type (ul > li > ol) without converting the outer list.
 * @param {HTMLElement[]} blocks
 * @returns {HTMLElement[]}
 */
function getListCommandBlocks(blocks) {
  const innermost = getInnermostBlocks(blocks);
  if (shareSameParentList(innermost)) {
    return innermost;
  }

  return getOutermostBlocks(blocks);
}

/**
 * @param {HTMLElement[]} items
 * @returns {HTMLElement[][]}
 */
function groupConsecutiveSiblings(items) {
  /** @type {HTMLElement[][]} */
  const groups = [];
  /** @type {HTMLElement[]} */
  let currentGroup = [];

  for (const item of items) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }

    const previous = currentGroup[currentGroup.length - 1];
    if (
      item.parentElement === previous.parentElement
      && item.previousElementSibling === previous
    ) {
      currentGroup.push(item);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [item];
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * @param {HTMLElement} listItem
 * @returns {HTMLElement[]}
 */
function extractListItemContent(listItem) {
  /** @type {HTMLElement[]} */
  const blocks = [];
  let pendingInlines = document.createDocumentFragment();

  const flushInlines = () => {
    if (!pendingInlines.hasChildNodes()) {
      return;
    }

    const paragraph = document.createElement('p');
    paragraph.appendChild(pendingInlines);
    pendingInlines = document.createDocumentFragment();
    if (!paragraph.hasChildNodes()) {
      paragraph.appendChild(document.createElement('br'));
    }
    blocks.push(paragraph);
  };

  while (listItem.firstChild) {
    const child = listItem.firstChild;
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = /** @type {HTMLElement} */ (child);
      const tag = element.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol' || LIST_ITEM_FLOW_TAGS.has(tag)) {
        flushInlines();
        child.remove();
        blocks.push(element);
        continue;
      }
    }

    pendingInlines.appendChild(child);
  }

  flushInlines();

  if (blocks.length === 0) {
    const paragraph = document.createElement('p');
    paragraph.appendChild(document.createElement('br'));
    blocks.push(paragraph);
  }

  return blocks;
}

/**
 * @param {HTMLElement} list
 * @param {Node} insertedNode
 * @param {Element | null} previousSibling
 * @param {Element | null} nextSibling
 */
function insertSplittingList(list, insertedNode, previousSibling, nextSibling) {
  if (!previousSibling && !nextSibling) {
    list.replaceWith(insertedNode);
    return;
  }

  if (!previousSibling) {
    list.before(insertedNode);
    return;
  }

  if (nextSibling) {
    const afterList = document.createElement(list.tagName.toLowerCase());
    let sibling = nextSibling;
    while (sibling) {
      const following = sibling.nextElementSibling;
      afterList.appendChild(sibling);
      sibling = following;
    }
    list.after(afterList);
  }

  list.after(insertedNode);

  if (list.isConnected && list.children.length === 0) {
    list.remove();
  }
}

/**
 * @param {HTMLElement[]} items
 * @returns {HTMLElement | null}
 */
function unwrapConsecutiveListItems(items) {
  const parentList = items[0].parentElement;
  if (!isListElement(parentList)) {
    return null;
  }

  const grandparent = parentList.parentElement;
  if (isListElement(grandparent)) {
    let lastItem = null;
    for (const item of items) {
      grandparent.insertBefore(item, parentList);
      lastItem = item;
    }
    if (parentList.children.length === 0) {
      parentList.remove();
    }
    return lastItem;
  }

  const previousSibling = items[0].previousElementSibling;
  const nextSibling = items[items.length - 1].nextElementSibling;
  const fragment = document.createDocumentFragment();

  for (const item of items) {
    for (const node of extractListItemContent(item)) {
      fragment.appendChild(node);
    }
    item.remove();
  }

  const lastBlock = fragment.lastElementChild instanceof HTMLElement
    ? fragment.lastElementChild
    : null;

  insertSplittingList(parentList, fragment, previousSibling, nextSibling);

  if (parentList.isConnected && parentList.children.length === 0) {
    parentList.remove();
  }

  return lastBlock;
}

/**
 * @param {HTMLElement[]} listItems
 * @returns {HTMLElement | null}
 */
function unwrapListItems(listItems) {
  if (listItems.length === 0) {
    return null;
  }

  const connectedItems = listItems.filter(
    (item) => item.isConnected && item.tagName.toLowerCase() === 'li',
  );
  if (connectedItems.length === 0) {
    return null;
  }

  /** @type {HTMLElement | null} */
  let lastBlock = null;
  for (const group of groupConsecutiveSiblings(connectedItems)) {
    lastBlock = unwrapConsecutiveListItems(group) ?? lastBlock;
  }

  return lastBlock;
}

/**
 * @param {HTMLElement} block
 * @returns {HTMLElement | null}
 */
function liftBlockOutOfList(block) {
  const parentList = block.parentElement;
  if (!isListElement(parentList)) {
    return block.isConnected ? block : null;
  }

  const previousSibling = block.previousElementSibling;
  const nextSibling = block.nextElementSibling;
  insertSplittingList(parentList, block, previousSibling, nextSibling);

  if (parentList.isConnected && parentList.children.length === 0) {
    parentList.remove();
  }

  return block.isConnected ? block : null;
}

/**
 * @param {HTMLElement[]} blocks
 * @param {'ul' | 'ol'} listTag
 * @returns {HTMLElement | null}
 */
function wrapBlocksInList(blocks, listTag) {
  if (blocks.length === 0) {
    return null;
  }

  const list = document.createElement(listTag);

  for (const block of blocks) {
    const item = document.createElement('li');
    while (block.firstChild) {
      item.appendChild(block.firstChild);
    }
    list.appendChild(item);
  }

  blocks[0].replaceWith(list);
  for (let index = 1; index < blocks.length; index += 1) {
    blocks[index].remove();
  }

  const lastItem = list.lastElementChild;
  return lastItem instanceof HTMLElement ? lastItem : null;
}

/**
 * @param {HTMLElement[]} items
 * @param {'ul' | 'ol'} listTag
 * @returns {HTMLElement | null}
 */
function convertConsecutiveListItems(items, listTag) {
  const parentList = items[0].parentElement;
  if (!isListElement(parentList)) {
    return items[items.length - 1];
  }

  if (parentList.tagName.toLowerCase() === listTag) {
    return items[items.length - 1];
  }

  const newList = document.createElement(listTag);
  const previousSibling = items[0].previousElementSibling;
  const nextSibling = items[items.length - 1].nextElementSibling;

  for (const item of items) {
    newList.appendChild(item);
  }

  insertSplittingList(parentList, newList, previousSibling, nextSibling);

  if (parentList.isConnected && parentList.children.length === 0) {
    parentList.remove();
  }

  const lastItem = newList.lastElementChild;
  return lastItem instanceof HTMLElement ? lastItem : null;
}

/**
 * @param {HTMLElement[]} listItems
 * @param {'ul' | 'ol'} listTag
 * @returns {HTMLElement | null}
 */
function convertListItems(listItems, listTag) {
  /** @type {HTMLElement | null} */
  let lastItem = null;

  for (const group of groupConsecutiveSiblings(listItems)) {
    lastItem = convertConsecutiveListItems(group, listTag) ?? lastItem;
  }

  return lastItem;
}

/**
 * @param {HTMLElement} list
 * @param {'ul' | 'ol'} listTag
 * @returns {HTMLElement}
 */
function convertListType(list, listTag) {
  if (list.tagName.toLowerCase() === listTag) {
    return list;
  }

  const converted = document.createElement(listTag);
  while (list.firstChild) {
    converted.appendChild(list.firstChild);
  }
  list.replaceWith(converted);
  return converted;
}

/**
 * @param {HTMLElement[]} blocks
 * @param {'ul' | 'ol'} listTag
 * @returns {HTMLElement | null}
 */
function applyList(blocks, listTag) {
  /** @type {HTMLElement | null} */
  let lastItem = null;
  /** @type {HTMLElement[]} */
  const pendingBlocks = [];
  /** @type {HTMLElement[]} */
  const pendingListItems = [];

  const flushPendingBlocks = () => {
    if (pendingBlocks.length === 0) {
      return;
    }

    lastItem = wrapBlocksInList(pendingBlocks, listTag) ?? lastItem;
    pendingBlocks.length = 0;
  };

  const flushPendingListItems = () => {
    if (pendingListItems.length === 0) {
      return;
    }

    lastItem = convertListItems(pendingListItems, listTag) ?? lastItem;
    pendingListItems.length = 0;
  };

  for (const block of blocks) {
    if (block.tagName.toLowerCase() === 'li') {
      flushPendingBlocks();
      pendingListItems.push(block);
      continue;
    }

    flushPendingListItems();

    const enclosingList = getEnclosingList(block);
    if (enclosingList) {
      flushPendingBlocks();
      convertListType(enclosingList, listTag);
      lastItem = block;
      continue;
    }

    pendingBlocks.push(block);
  }

  flushPendingListItems();
  flushPendingBlocks();
  return lastItem;
}

/**
 * @param {HTMLElement | null | undefined} list
 */
function normalizeList(list) {
  if (!list) {
    return;
  }

  const tag = list.tagName.toLowerCase();
  if (tag !== 'ul' && tag !== 'ol') {
    return;
  }

  if (list.children.length > 0) {
    return;
  }

  list.remove();
}

/**
 * @param {HTMLElement} list
 * @returns {boolean}
 */
function liftDirectChildList(list) {
  const parent = list.parentElement;
  if (!isListElement(parent)) {
    return false;
  }

  const previousSibling = list.previousElementSibling;
  const nextSibling = list.nextElementSibling;
  insertSplittingList(parent, list, previousSibling, nextSibling);

  if (parent.isConnected && parent.children.length === 0) {
    parent.remove();
  }

  return true;
}

/**
 * @param {HTMLElement} list
 * @returns {boolean}
 */
function wrapNonLiListChildren(list) {
  let changed = false;

  for (const child of [...list.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (!child.textContent?.trim()) {
        child.remove();
        changed = true;
        continue;
      }

      const item = document.createElement('li');
      item.textContent = child.textContent;
      child.replaceWith(item);
      changed = true;
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      changed = true;
      continue;
    }

    const element = /** @type {HTMLElement} */ (child);
    const tag = element.tagName.toLowerCase();
    if (tag === 'li' || tag === 'ul' || tag === 'ol') {
      continue;
    }

    const item = document.createElement('li');
    element.replaceWith(item);
    if (LIST_ITEM_FLOW_TAGS.has(tag)) {
      while (element.firstChild) {
        item.appendChild(element.firstChild);
      }
    } else {
      item.appendChild(element);
    }

    if (!item.hasChildNodes()) {
      item.appendChild(document.createElement('br'));
    }
    changed = true;
  }

  return changed;
}

/**
 * @param {HTMLElement} root
 * @returns {boolean}
 */
function mergeAdjacentLists(root) {
  let changed = false;

  for (const list of [...root.querySelectorAll('ul, ol')]) {
    if (!list.isConnected) {
      continue;
    }

    const next = list.nextElementSibling;
    if (!isListElement(next) || next.tagName !== list.tagName) {
      continue;
    }

    while (next.firstChild) {
      list.appendChild(next.firstChild);
    }
    next.remove();
    changed = true;
  }

  return changed;
}

/**
 * @param {HTMLElement} root
 */
function normalizeListStructure(root) {
  let changed = true;

  while (changed) {
    changed = false;

    for (const list of [...root.querySelectorAll('ul, ol')]) {
      if (!list.isConnected) {
        continue;
      }

      if (liftDirectChildList(list)) {
        changed = true;
        continue;
      }

      if (wrapNonLiListChildren(list)) {
        changed = true;
      }

      if (list.children.length === 0) {
        list.remove();
        changed = true;
      }
    }

    if (mergeAdjacentLists(root)) {
      changed = true;
    }
  }
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('../../core/selection.js').createSelectionManager>} selection
 * @param {'ul' | 'ol'} listTag
 */
export function toggleList(root, selection, listTag) {
  const range = selection.getRange();
  if (!range) {
    return;
  }

  const blocks = getListCommandBlocks(getBlocksInRange(root, range));
  if (blocks.length === 0) {
    const paragraph = document.createElement('p');
    paragraph.appendChild(document.createElement('br'));
    root.appendChild(paragraph);
    toggleList(root, selection, listTag);
    return;
  }

  const allInTargetList = blocks.every((block) => {
    const enclosingList = getEnclosingList(block);
    return enclosingList?.tagName.toLowerCase() === listTag;
  });

  /** @type {HTMLElement | null} */
  let focusNode = null;

  if (allInTargetList) {
    const listItems = blocks.filter((block) => block.tagName.toLowerCase() === 'li');
    const otherBlocks = blocks.filter((block) => block.tagName.toLowerCase() !== 'li');
    focusNode = unwrapListItems(listItems);
    for (const block of otherBlocks) {
      focusNode = liftBlockOutOfList(block) ?? focusNode;
    }
  } else {
    focusNode = applyList(blocks, listTag);
  }

  normalizeListStructure(root);

  if (!focusNode?.isConnected) {
    return;
  }

  const newRange = document.createRange();
  newRange.selectNodeContents(focusNode);
  newRange.collapse(!allInTargetList);
  selection.setRange(newRange);
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('../../core/selection.js').createSelectionManager>} selection
 * @returns {boolean}
 */
export function indentListItem(root, selection) {
  const listItem = getActiveListItem(root, selection);
  if (!listItem) {
    return false;
  }

  const previousItem = listItem.previousElementSibling;
  if (!(previousItem instanceof HTMLElement) || previousItem.tagName.toLowerCase() !== 'li') {
    return false;
  }

  const parentList = listItem.parentElement;
  if (!parentList) {
    return false;
  }

  let nestedList = [...previousItem.children].find((child) => isListElement(child));
  if (!nestedList) {
    nestedList = document.createElement(parentList.tagName.toLowerCase());
    previousItem.appendChild(nestedList);
  }

  nestedList.appendChild(listItem);

  const newRange = document.createRange();
  newRange.selectNodeContents(listItem);
  newRange.collapse(true);
  selection.setRange(newRange);
  return true;
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('../../core/selection.js').createSelectionManager>} selection
 * @returns {boolean}
 */
export function outdentListItem(root, selection) {
  const listItem = getActiveListItem(root, selection);
  if (!listItem) {
    return false;
  }

  const parentList = listItem.parentElement;
  if (!(parentList instanceof HTMLElement)) {
    return false;
  }

  const parentTag = parentList.tagName.toLowerCase();
  if (parentTag !== 'ul' && parentTag !== 'ol') {
    return false;
  }

  const owningItem = parentList.parentElement;
  if (!(owningItem instanceof HTMLElement) || owningItem.tagName.toLowerCase() !== 'li') {
    return false;
  }

  const outerList = owningItem.parentElement;
  if (!(outerList instanceof HTMLElement)) {
    return false;
  }

  outerList.insertBefore(listItem, owningItem.nextSibling);
  normalizeList(parentList);

  const newRange = document.createRange();
  newRange.selectNodeContents(listItem);
  newRange.collapse(true);
  selection.setRange(newRange);
  return true;
}

/**
 * @param {HTMLElement} listItem
 */
function listItemHasMeaningfulContent(listItem) {
  if (listItem.querySelector('img, ul, ol, table, audio, video')) {
    return true;
  }

  return listItem.textContent?.trim() !== '';
}

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('../../core/selection.js').createSelectionManager>} selection
 * @returns {boolean}
 */
export function exitEmptyListItem(root, selection) {
  const listItem = getActiveListItem(root, selection);
  if (!listItem || listItemHasMeaningfulContent(listItem)) {
    return false;
  }

  const parentList = listItem.parentElement;
  const paragraph = document.createElement('p');
  paragraph.appendChild(document.createElement('br'));
  listItem.replaceWith(paragraph);
  normalizeList(parentList);

  const newRange = document.createRange();
  newRange.selectNodeContents(paragraph);
  newRange.collapse(true);
  selection.setRange(newRange);
  return true;
}
