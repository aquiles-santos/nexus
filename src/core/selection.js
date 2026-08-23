/**
 * @typedef {{ start: { path: number[], offset: number }, end: { path: number[], offset: number } }} NexusBookmark
 */

function getNodePath(root, node) {
  const path = [];
  let current = node;

  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) {
      break;
    }
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  return path;
}

function getNodeFromPath(root, path) {
  let current = root;

  for (const index of path) {
    if (!current?.childNodes?.[index]) {
      return null;
    }
    current = current.childNodes[index];
  }

  return current;
}

export function createSelectionManager(root) {
  function getSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      return null;
    }

    return selection;
  }

  function getRange() {
    const selection = getSelection();
    if (!selection) {
      return null;
    }
    return selection.getRangeAt(0);
  }

  /** @returns {NexusBookmark | null} */
  function saveBookmark() {
    const range = getRange();
    if (!range) {
      return null;
    }

    return {
      start: {
        path: getNodePath(root, range.startContainer),
        offset: range.startOffset,
      },
      end: {
        path: getNodePath(root, range.endContainer),
        offset: range.endOffset,
      },
    };
  }

  /** @param {NexusBookmark | null} bookmark */
  function restoreBookmark(bookmark) {
    if (!bookmark) {
      return;
    }

    const startNode = getNodeFromPath(root, bookmark.start.path);
    const endNode = getNodeFromPath(root, bookmark.end.path);

    if (!startNode || !endNode) {
      return;
    }

    const range = document.createRange();
    const startOffset = Math.min(bookmark.start.offset, startNode.nodeType === Node.TEXT_NODE ? startNode.textContent.length : startNode.childNodes.length);
    const endOffset = Math.min(bookmark.end.offset, endNode.nodeType === Node.TEXT_NODE ? endNode.textContent.length : endNode.childNodes.length);

    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function isWithin(tag) {
    const range = getRange();
    if (!range) {
      return false;
    }

    const normalizedTag = tag.toLowerCase();

    function nodeHasTag(node) {
      let current = node;

      while (current && current !== root) {
        if (!root.contains(current)) {
          return false;
        }

        if (current.nodeType === Node.ELEMENT_NODE && current.tagName.toLowerCase() === normalizedTag) {
          return true;
        }
        current = current.parentNode;
      }

      return false;
    }

    return nodeHasTag(range.startContainer) || nodeHasTag(range.endContainer);
  }

  function setRange(range) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  return {
    getSelection,
    getRange,
    saveBookmark,
    restoreBookmark,
    isWithin,
    setRange,
    getNodePath,
    getNodeFromPath,
  };
}
