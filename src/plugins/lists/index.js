import { createToolbarIcon } from '../../ui/icons/icons.js';
import { getActiveListType } from '../../core/content-queries.js';
import {
  exitEmptyListItem,
  indentListItem,
  outdentListItem,
  toggleList,
} from './list-commands.js';

/** @type {Map<object, (() => void)[]>} */
const teardownsByEditor = new Map();

function clearTeardowns(editor) {
  const teardowns = teardownsByEditor.get(editor);
  if (!teardowns) {
    return;
  }

  for (const teardown of teardowns) {
    teardown();
  }
  teardownsByEditor.delete(editor);
}

/** @type {import('../../shared/plugin-registry.js').NexusPlugin} */
export const pluginLists = {
  name: 'lists',

  init(editor) {
    clearTeardowns(editor);
    const content = editor.contentElement;
    const selection = editor.selection;

    const handleKeyDown = (event) => {
      if (!selection) {
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        if (exitEmptyListItem(content, selection)) {
          event.preventDefault();
          editor.recordUndo();
          editor.updateToolbarState();
        }
        return;
      }

      if (event.key !== 'Tab' || !getActiveListType(content, selection)) {
        return;
      }

      const didChange = event.shiftKey
        ? outdentListItem(content, selection)
        : indentListItem(content, selection);
      if (!didChange) {
        return;
      }

      event.preventDefault();
      editor.recordUndo();
      editor.updateToolbarState();
    };

    content.addEventListener('keydown', handleKeyDown);

    teardownsByEditor.set(editor, [
      () => content.removeEventListener('keydown', handleKeyDown),
      editor.toolbar.registerItem('insertUnorderedList', {
        command: 'insertUnorderedList',
        label: 'Lista com marcadores',
        icon: () => createToolbarIcon('listUl'),
        type: 'toggle',
      }),
      editor.toolbar.registerItem('insertOrderedList', {
        command: 'insertOrderedList',
        label: 'Lista numerada',
        icon: () => createToolbarIcon('listOl'),
        type: 'toggle',
      }),
    ]);
  },

  commands: {
    insertUnorderedList(editor) {
      const selection = editor.selection;
      if (!selection) {
        return;
      }
      toggleList(editor.contentElement, selection, 'ul');
    },
    insertOrderedList(editor) {
      const selection = editor.selection;
      if (!selection) {
        return;
      }
      toggleList(editor.contentElement, selection, 'ol');
    },
  },

  shortcuts: {},

  destroy(editor) {
    if (editor) {
      clearTeardowns(editor);
      return;
    }

    for (const instance of [...teardownsByEditor.keys()]) {
      clearTeardowns(instance);
    }
  },
};
