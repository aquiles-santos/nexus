import { createNexusEditor } from '/src/nexus.js';
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

  editor.setContent(INITIAL_HTML);
  mount.appendChild(editor);

  return destroy;
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor(document);
});
