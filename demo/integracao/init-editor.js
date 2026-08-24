import { createNexusEditor } from '/src/editor/nexus-editor.js';
import { pluginBasicFormats } from '/src/plugins/basic-formats/index.js';
import { pluginLists } from '/src/plugins/lists/index.js';
import { pluginLink } from '/src/plugins/link/index.js';
import { pluginMedia } from '/src/plugins/media/index.js';
import { pluginPasteClean } from '/src/plugins/paste-clean/index.js';
import { pluginSourceCode } from '/src/plugins/source-code/index.js';
import { editorConfig } from './nexus-config.js';

const INITIAL_HTML =
  '<p>Este conteúdo foi definido pela página hospedeira com <strong>setContent</strong>.</p>';

/**
 * @param {ParentNode} root
 * @returns {() => void}
 */
export function initEditor(root) {
  const mount = root.querySelector('[data-editor-root]');
  if (!mount) {
    return () => {};
  }

  const { element: editor, destroy } = createNexusEditor(editorConfig);
  const labelledBy = mount.closest('.host-field')?.querySelector('.host-label')?.id;
  if (labelledBy) {
    editor.setAttribute('aria-labelledby', labelledBy);
  }

  editor.use(pluginBasicFormats);
  editor.use(pluginLists);
  editor.use(pluginLink);
  editor.use(pluginMedia);
  editor.use(pluginPasteClean);
  editor.use(pluginSourceCode);
  editor.setContent(INITIAL_HTML);
  mount.appendChild(editor);

  return destroy;
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor(document);
});
