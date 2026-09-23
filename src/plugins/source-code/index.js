import { formatHtmlPretty } from '../../data/html-serializer.js';
import { sanitizeHtml } from '../../data/sanitizer.js';
import { createToolbarIcon } from '../../ui/icons/icons.js';

/** @type {Map<object, { teardowns: (() => void)[], sourceInput: HTMLTextAreaElement, ownsSourceShell: boolean }>} */
const stateByEditor = new Map();

function clearState(editor) {
  const state = stateByEditor.get(editor);
  if (!state) {
    return;
  }

  for (const teardown of state.teardowns) {
    teardown();
  }

  if (state.ownsSourceShell) {
    state.sourceInput.closest('[data-nexus-source]')?.remove();
  }

  stateByEditor.delete(editor);
}

function getSourceHtml(editor) {
  const state = stateByEditor.get(editor);
  if (!state) {
    return null;
  }
  return sanitizeHtml(state.sourceInput.value);
}

function setVisualMode(editor) {
  const state = stateByEditor.get(editor);
  if (!state) {
    return;
  }

  editor.setContent(state.sourceInput.value);
  editor.removeAttribute('data-mode');
  editor.toolbar.setPressed('toggleSource', false);
  editor.toolbar.setLabel('toggleSource', 'Código');
  editor.toolbar.setIcon('toggleSource', createToolbarIcon('code'));
}

function setSourceMode(editor) {
  const state = stateByEditor.get(editor);
  if (!state) {
    return;
  }

  state.sourceInput.value = formatHtmlPretty(editor.getContent({ format: 'html' }));
  editor.setAttribute('data-mode', 'source');
  editor.toolbar.setPressed('toggleSource', true);
  editor.toolbar.setLabel('toggleSource', 'Visual');
  editor.toolbar.setIcon('toggleSource', createToolbarIcon('eye'));
  queueMicrotask(() => state.sourceInput.focus());
}

/** @type {import('../../shared/plugin-registry.js').NexusPlugin} */
export const pluginSourceCode = {
  name: 'source-code',

  init(editor) {
    clearState(editor);

    let sourceInput = editor.querySelector('[data-source-input]');
    let ownsSourceShell = false;

    if (!(sourceInput instanceof HTMLTextAreaElement)) {
      const shell = document.createElement('div');
      shell.setAttribute('data-nexus-source', '');

      sourceInput = document.createElement('textarea');
      sourceInput.className = 'nexus-source-input';
      sourceInput.setAttribute('data-source-input', '');
      sourceInput.setAttribute('aria-label', 'Código HTML');
      sourceInput.spellcheck = false;

      shell.appendChild(sourceInput);
      editor.scrollerElement.appendChild(shell);
      ownsSourceShell = true;
    }

    stateByEditor.set(editor, {
      sourceInput,
      ownsSourceShell,
      teardowns: [
        editor.toolbar.registerItem('toggleSource', {
          command: 'toggleSource',
          label: 'Código',
          icon: () => createToolbarIcon('code'),
          type: 'toggle',
          overflowPriority: 10,
        }),
      ],
    });
  },

  commands: {
    toggleSource(editor) {
      if (editor.getAttribute('data-mode') === 'source') {
        setVisualMode(editor);
        return;
      }
      setSourceMode(editor);
    },
  },

  shortcuts: {},

  destroy(editor) {
    clearState(editor);
  },
};

export { getSourceHtml };
