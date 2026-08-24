import { DEFAULT_TOOLBAR } from '/src/editor/editor-config.js';

/**
 * @type {import('../../src/editor/editor-config.js').NexusEditorConfigInput}
 */
export const editorConfig = {
  height: 400,
  toolbar: [
    ...DEFAULT_TOOLBAR,
    '|',
    'insertUnorderedList',
    'insertOrderedList',
    '|',
    'insertLink',
    'insertImage',
    '|',
    'toggleSource',
  ],
};
