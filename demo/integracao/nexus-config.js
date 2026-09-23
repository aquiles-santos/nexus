/**
 * @type {import('../../src/editor/editor-config.js').NexusEditorConfigInput}
 */
export const editorConfig = {
  height: 600,
  plugins: 'basic-formats lists link media paste-clean source-code',
  toolbar: [
    'undo',
    'redo',
    '|',
    'formatBlock',
    '|',
    'bold',
    'italic',
    'underline',
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
