import { describe, it, expect, beforeEach } from 'vitest';
import { createSelectionManager } from './selection.js';
import {
  findAncestor,
  findAncestorAnchor,
  getActiveListType,
} from './content-queries.js';

describe('content-queries', () => {
  /** @type {HTMLElement} */
  let root;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.replaceChildren(root);
  });

  it('finds an ancestor matching a predicate', () => {
    root.innerHTML = '<p><strong>Hello</strong></p>';
    const text = root.querySelector('strong').firstChild;

    const paragraph = findAncestor(root, text, (element) => element.tagName.toLowerCase() === 'p');
    expect(paragraph?.tagName.toLowerCase()).toBe('p');
  });

  it('finds the nearest anchor', () => {
    root.innerHTML = '<p><a href="/docs">Hello</a></p>';
    const text = root.querySelector('a').firstChild;

    expect(findAncestorAnchor(root, text)?.getAttribute('href')).toBe('/docs');
  });

  it('reports the active list type from the caret', () => {
    root.innerHTML = '<ul><li>Item</li></ul>';
    const selection = createSelectionManager(root);
    const text = root.querySelector('li').firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.collapse(true);
    selection.setRange(range);

    expect(getActiveListType(root, selection)).toBe('ul');
  });
});
