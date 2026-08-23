import { filterHtml } from './schema.js';

/**
 * @param {HTMLElement} root
 * @param {() => import('./selection.js').NexusBookmark | null} getBookmark
 */
export function createUndoManager(root, getBookmark) {
  /** @type {{ html: string, bookmark: import('./selection.js').NexusBookmark | null }[]} */
  const undoStack = [];
  /** @type {{ html: string, bookmark: import('./selection.js').NexusBookmark | null }[]} */
  const redoStack = [];
  let isRestoring = false;
  let inputTimer = null;

  function record(clearRedo = true) {
    if (isRestoring) {
      return;
    }

    const snapshot = {
      html: root.innerHTML,
      bookmark: getBookmark(),
    };

    const last = undoStack[undoStack.length - 1];
    if (last && last.html === snapshot.html) {
      return;
    }

    undoStack.push(snapshot);

    if (clearRedo) {
      redoStack.length = 0;
    }
  }

  function undo() {
    if (undoStack.length <= 1) {
      return false;
    }

    const current = undoStack.pop();
    if (current) {
      redoStack.push(current);
    }

    const previous = undoStack[undoStack.length - 1];
    restoreSnapshot(previous);
    return true;
  }

  function redo() {
    const next = redoStack.pop();
    if (!next) {
      return false;
    }

    undoStack.push(next);
    restoreSnapshot(next);
    return true;
  }

  /** @param {{ html: string, bookmark: import('./selection.js').NexusBookmark | null }} snapshot */
  function restoreSnapshot(snapshot) {
    isRestoring = true;
    root.innerHTML = filterHtml(snapshot.html);

    if (snapshot.bookmark) {
      const event = new CustomEvent('nexus:restore-bookmark', {
        detail: snapshot.bookmark,
      });
      root.dispatchEvent(event);
    }

    isRestoring = false;
  }

  function recordInput() {
    if (isRestoring) {
      return;
    }

    if (inputTimer) {
      clearTimeout(inputTimer);
    }

    inputTimer = setTimeout(() => {
      record();
      inputTimer = null;
    }, 300);
  }

  function canUndo() {
    return undoStack.length > 1;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  function reset() {
    undoStack.length = 0;
    redoStack.length = 0;
    record(false);
  }

  function destroy() {
    if (inputTimer) {
      clearTimeout(inputTimer);
      inputTimer = null;
    }
    undoStack.length = 0;
    redoStack.length = 0;
  }

  return {
    record,
    recordInput,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    destroy,
  };
}
