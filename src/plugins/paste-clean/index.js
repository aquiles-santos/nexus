import { cleanWordHtml } from '../../data/sanitizer.js';

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
export const pluginPasteClean = {
  name: 'paste-clean',

  init(editor) {
    clearTeardowns(editor);

    const handlePasteTransform = (detail) => {
      detail.html = cleanWordHtml(detail.html);
    };

    const unsubscribe = editor.bus.on('paste:transform', handlePasteTransform);
    teardownsByEditor.set(editor, [unsubscribe]);
  },

  commands: {},

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
