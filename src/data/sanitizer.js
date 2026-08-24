import { filterHtml } from '../core/schema.js';

const WORD_TAG_REPLACEMENTS = {
  b: 'strong',
  i: 'em',
};

const WORD_REMOVE_TAGS = new Set(['o:p', 'xml', 'meta', 'link', 'style', 'script']);

/**
 * Removes Word/Docs proprietary markup before schema filtering.
 * @param {string} html
 * @returns {string}
 */
export function cleanWordHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;

  /** @type {Comment[]} */
  const comments = [];
  const commentWalker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_COMMENT,
  );
  let comment = commentWalker.nextNode();
  while (comment) {
    comments.push(/** @type {Comment} */ (comment));
    comment = commentWalker.nextNode();
  }
  for (const node of comments) {
    node.parentNode?.removeChild(node);
  }

  /** @type {Element[]} */
  const elements = [];
  for (const child of template.content.querySelectorAll('*')) {
    elements.push(child);
  }

  for (const element of elements) {
    if (!element.parentNode) {
      continue;
    }

    const tag = element.tagName.toLowerCase();

    if (WORD_REMOVE_TAGS.has(tag)) {
      element.remove();
      continue;
    }

    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      if (
        name === 'style'
        || name === 'class'
        || name.startsWith('mso-')
        || name.startsWith('on')
      ) {
        element.removeAttribute(attr.name);
      }
    }

    const replacement = WORD_TAG_REPLACEMENTS[tag];
    if (replacement) {
      const replacementElement = document.createElement(replacement);
      while (element.firstChild) {
        replacementElement.appendChild(element.firstChild);
      }
      element.replaceWith(replacementElement);
      continue;
    }

    if (tag === 'span' || tag === 'font' || tag === 'div') {
      const parent = element.parentNode;
      if (!parent) {
        continue;
      }
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
    }
  }

  return template.innerHTML;
}

/**
 * Parses HTML in a `<template>` (scripts do not run) and keeps schema-allowlisted
 * tags, attributes, and URL protocols. DOMPurify is not a dependency; keep
 * `schema.test.js` coverage in sync when the allowlist changes.
 * @param {string} html
 * @param {ReturnType<import('../shared/event-bus.js').createEventBus> | null | undefined} [bus]
 * @returns {string}
 */
export function sanitizeIncomingHtml(html, bus) {
  const detail = { html };
  bus?.emit('paste:transform', detail);
  return filterHtml(detail.html);
}

/**
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  return filterHtml(html);
}
