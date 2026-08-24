import { filterHtml } from '../core/schema.js';

/**
 * @typedef {{ type: 'root', children: AstNode[] }} AstRoot
 * @typedef {{ type: 'text', value: string }} AstText
 * @typedef {{ type: 'element', tag: string, attrs: Record<string, string>, children: AstNode[] }} AstElement
 * @typedef {AstRoot | AstText | AstElement} AstNode
 */

const SERIALIZABLE_ATTRS = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
};

/**
 * @param {Node} node
 * @returns {AstNode | null}
 */
function nodeToAst(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? '';
    if (!value) {
      return null;
    }
    return { type: 'text', value };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = /** @type {Element} */ (node);
  const tag = element.tagName.toLowerCase();
  /** @type {Record<string, string>} */
  const attrs = {};
  const allowed = SERIALIZABLE_ATTRS[tag] ?? [];

  for (const name of allowed) {
    const value = element.getAttribute(name);
    if (value !== null) {
      attrs[name] = value;
    }
  }

  /** @type {AstNode[]} */
  const children = [];
  for (const child of element.childNodes) {
    const childAst = nodeToAst(child);
    if (childAst) {
      children.push(childAst);
    }
  }

  return { type: 'element', tag, attrs, children };
}

/**
 * @param {ParentNode} root
 * @returns {AstRoot}
 */
export function serializeAst(root) {
  let sourceRoot = root;

  if (root instanceof HTMLElement && root.hasAttribute('data-nexus-content')) {
    const template = document.createElement('template');
    template.innerHTML = filterHtml(root.innerHTML);
    sourceRoot = template.content;
  } else {
    const container = document.createElement('div');
    for (const child of [...root.childNodes]) {
      container.appendChild(child.cloneNode(true));
    }
    const template = document.createElement('template');
    template.innerHTML = filterHtml(container.innerHTML);
    sourceRoot = template.content;
  }

  /** @type {AstNode[]} */
  const children = [];
  for (const child of sourceRoot.childNodes) {
    const childAst = nodeToAst(child);
    if (childAst) {
      children.push(childAst);
    }
  }

  return { type: 'root', children };
}
