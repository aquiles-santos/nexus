import { filterHtml } from '../core/schema.js';

/**
 * @param {ParentNode} root
 * @returns {string}
 */
export function serializeHtml(root) {
  if (root instanceof HTMLElement && root.hasAttribute('data-nexus-content')) {
    return filterHtml(root.innerHTML);
  }

  const container = document.createElement('div');
  for (const child of [...root.childNodes]) {
    container.appendChild(child.cloneNode(true));
  }
  return filterHtml(container.innerHTML);
}

/**
 * @param {string} html
 * @returns {string}
 */
export function formatHtmlPretty(html) {
  return html.replace(/></g, '>\n<').replace(/\n+/g, '\n').trim();
}
