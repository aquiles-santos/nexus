import {
  createNexusEditor as createNexusEditorElement,
  TAG_NAME,
  DEFAULT_EDITOR_HEIGHT,
  DEFAULT_PLACEHOLDER,
  DEFAULT_TOOLBAR,
  TOOLBAR_SEPARATOR,
} from './editor/nexus-editor.js';
import { resolvePlugins } from './plugins/catalog.js';

/**
 * @param {import('./editor/nexus-editor.js').NexusEditorElement} element
 * @param {import('./editor/editor-config.js').NexusEditorConfigInput['plugins']} pluginsInput
 */
function applyInitPlugins(element, pluginsInput) {
  if (pluginsInput === undefined) {
    return;
  }

  for (const plugin of resolvePlugins(pluginsInput)) {
    element.use(plugin);
  }
}

/**
 * High-level factory: resolves `init.plugins` names via the catalog and calls `use()`.
 * The custom element in `nexus-editor.js` stays free of plugin imports.
 *
 * @param {import('./editor/editor-config.js').NexusEditorConfigInput} [config]
 * @returns {{ element: import('./editor/nexus-editor.js').NexusEditorElement, destroy: () => void }}
 */
export function createNexusEditor(config) {
  const { element, destroy } = createNexusEditorElement(config);
  applyInitPlugins(element, config?.plugins);

  const originalConfigure = element.configure.bind(element);
  element.configure = (input = {}) => {
    originalConfigure(input);
    applyInitPlugins(element, input.plugins);
  };

  return { element, destroy };
}

export {
  TAG_NAME,
  DEFAULT_EDITOR_HEIGHT,
  DEFAULT_PLACEHOLDER,
  DEFAULT_TOOLBAR,
  TOOLBAR_SEPARATOR,
};
export { PLUGIN_CATALOG, resolvePlugins } from './plugins/catalog.js';
export { NexusEditorElement } from './editor/nexus-editor.js';
