const TAG_NAME = 'nexus-editor';

class NexusEditorElement extends HTMLElement {
  connectedCallback() {
    if (this.hasAttribute('data-nexus-initialized')) {
      return;
    }

    this.setAttribute('data-nexus-initialized', 'true');
    this.setAttribute('role', 'textbox');
    this.setAttribute('aria-multiline', 'true');
    this.setAttribute('aria-label', 'Editor de texto');

    const placeholder = document.createElement('div');
    placeholder.setAttribute('data-nexus-placeholder', '');
    placeholder.textContent = 'Comece a escrever…';
    this.appendChild(placeholder);
  }
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, NexusEditorElement);
}

/**
 * Creates and returns a nexus-editor element.
 * @returns {NexusEditorElement}
 */
export function createNexusEditor() {
  return document.createElement(TAG_NAME);
}

export { NexusEditorElement, TAG_NAME };
