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

/**
 * @type {import('../../shared/plugin-registry.js').NexusPlugin}
 */
export const pluginBasicFormats = {
  name: 'basic-formats',

  init(editor) {
    clearTeardowns(editor);
    teardownsByEditor.set(editor, [
      editor.toolbar.registerItem('formatBlock', {
        command: 'formatBlock',
        label: 'Estilo do bloco',
        options: [
          { value: 'p', label: 'Parágrafo' },
          { value: 'h1', label: 'Título 1' },
          { value: 'h2', label: 'Título 2' },
          { value: 'h3', label: 'Título 3' },
          { value: 'blockquote', label: 'Citação' },
        ],
      }),
      editor.toolbar.registerItem('bold', {
        command: 'bold',
        label: 'Negrito',
        text: 'B',
        type: 'toggle',
      }),
      editor.toolbar.registerItem('italic', {
        command: 'italic',
        label: 'Itálico',
        text: 'I',
        type: 'toggle',
      }),
      editor.toolbar.registerItem('underline', {
        command: 'underline',
        label: 'Sublinhado',
        text: 'U',
        type: 'toggle',
      }),
    ]);
  },

  commands: {},

  shortcuts: {
    'Ctrl+B': 'bold',
    'Ctrl+I': 'italic',
    'Ctrl+U': 'underline',
  },

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
