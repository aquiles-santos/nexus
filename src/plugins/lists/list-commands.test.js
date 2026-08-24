import { describe, it, expect, beforeEach } from 'vitest';
import { createSelectionManager } from '../../core/selection.js';
import {
  exitEmptyListItem,
  getBlocksInRange,
  indentListItem,
  toggleList,
} from './list-commands.js';

describe('list-commands', () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {ReturnType<typeof createSelectionManager>} */
  let selection;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    selection = createSelectionManager(root);
  });

  function selectAll() {
    const range = document.createRange();
    range.selectNodeContents(root);
    selection.setRange(range);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }

  it('unwraps a single list item without inserting an empty paragraph', () => {
    root.innerHTML =
      '<ul><li>Headings, lists, and quotes are not decoration.</li></ul>';
    selectAll();

    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe(
      '<p>Headings, lists, and quotes are not decoration.</p>',
    );
    expect(root.querySelectorAll('p')).toHaveLength(1);
  });

  it('unwraps multiple list items without deleting content', () => {
    root.innerHTML = '<ul><li>First</li><li>Second</li><li>Third</li></ul>';
    selectAll();

    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe('<p>First</p><p>Second</p><p>Third</p>');
  });

  it('round-trips wrap and unwrap without leftover empty paragraphs', () => {
    root.innerHTML = '<p>Alpha</p><p>Beta</p>';
    selectAll();
    toggleList(root, selection, 'ul');

    selectAll();
    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe('<p>Alpha</p><p>Beta</p>');
  });

  it('creates a single ordered list with sequential items', () => {
    root.innerHTML = '<p>Alpha</p><p>Beta</p><p>Gamma</p>';
    selectAll();

    toggleList(root, selection, 'ol');

    const items = root.querySelectorAll('ol > li');
    expect(items).toHaveLength(3);
    expect([...items].map((item) => item.textContent)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(root.querySelectorAll('ol')).toHaveLength(1);
  });

  it('collects list items in a multi-item selection', () => {
    root.innerHTML = '<ul><li>One</li><li>Two</li></ul>';
    const range = document.createRange();
    range.setStart(root.querySelector('li'), 0);
    range.setEnd(root.querySelectorAll('li')[1], 1);
    selection.setRange(range);

    const blocks = getBlocksInRange(root, range);
    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.tagName.toLowerCase() === 'li')).toBe(true);
  });

  it('converts a bullet list into a numbered list without nesting', () => {
    root.innerHTML = '<ul><li>Alpha</li><li>Beta</li></ul>';
    selectAll();

    toggleList(root, selection, 'ol');

    expect(root.innerHTML).toBe('<ol><li>Alpha</li><li>Beta</li></ol>');
    expect(root.querySelectorAll('ul')).toHaveLength(0);
    expect(root.querySelectorAll('ol')).toHaveLength(1);
  });

  it('converts a numbered list into a bullet list without nesting', () => {
    root.innerHTML = '<ol><li>Alpha</li><li>Beta</li></ol>';
    selectAll();

    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe('<ul><li>Alpha</li><li>Beta</li></ul>');
    expect(root.querySelectorAll('ol')).toHaveLength(0);
  });

  it('unwraps a converted numbered list without leftover empty list nodes', () => {
    root.innerHTML = '<ul><li>Alpha</li><li>Beta</li></ul>';
    selectAll();
    toggleList(root, selection, 'ol');

    selectAll();
    toggleList(root, selection, 'ol');

    expect(root.innerHTML).toBe('<p>Alpha</p><p>Beta</p>');
    expect(root.querySelectorAll('ul, ol, li')).toHaveLength(0);
  });

  it('converts back to a bullet list instead of nesting a new list', () => {
    root.innerHTML = '<ul><li>Alpha</li><li>Beta</li></ul>';
    selectAll();
    toggleList(root, selection, 'ol');

    selectAll();
    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe('<ul><li>Alpha</li><li>Beta</li></ul>');
    expect(root.querySelectorAll('ul')).toHaveLength(1);
    expect(root.querySelectorAll('ol')).toHaveLength(0);
  });

  it('lifts incorrectly nested numbered items instead of leaving an empty ol', () => {
    root.innerHTML = '<ul><ol><li>Alpha</li><li>Beta</li></ol></ul>';
    selectAll();

    toggleList(root, selection, 'ol');

    expect(root.querySelectorAll('ol')).toHaveLength(0);
    expect(root.querySelectorAll('ul > li')).toHaveLength(2);
    expect([...root.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Alpha',
      'Beta',
    ]);
  });

  it('unwraps a leftover bullet list after nested numbered cleanup', () => {
    root.innerHTML = '<ul><ol><li>Alpha</li></ol></ul>';
    selectAll();
    toggleList(root, selection, 'ol');

    selectAll();
    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe('<p>Alpha</p>');
    expect(root.querySelectorAll('ul, ol, li')).toHaveLength(0);
  });

  it('preserves nested lists that live inside list items', () => {
    root.innerHTML = '<ul><li>Alpha<ul><li>Nested</li></ul></li><li>Beta</li></ul>';
    selectAll();

    toggleList(root, selection, 'ol');

    expect(root.innerHTML).toBe(
      '<ol><li>Alpha<ul><li>Nested</li></ul></li><li>Beta</li></ol>',
    );
  });

  it('does not duplicate text when converting and unwrapping lists', () => {
    root.innerHTML = '<ul><li>Keep me</li></ul>';
    selectAll();
    toggleList(root, selection, 'ol');
    selectAll();
    toggleList(root, selection, 'ol');

    expect(root.textContent).toBe('Keep me');
    expect(root.innerHTML).toBe('<p>Keep me</p>');
  });

  it('unwraps leftover paragraphs inside a bullet list', () => {
    root.innerHTML = '<ul><p>Alpha</p></ul>';
    selectAll();

    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe('<p>Alpha</p>');
    expect(root.querySelectorAll('ul, ol, li')).toHaveLength(0);
  });

  it('converts leftover paragraphs inside a bullet list into numbered items', () => {
    root.innerHTML = '<ul><p>Alpha</p></ul>';
    selectAll();

    toggleList(root, selection, 'ol');

    expect(root.innerHTML).toBe('<ol><li>Alpha</li></ol>');
  });

  it('converts a nested bullet item into a numbered list without changing the outer list', () => {
    root.innerHTML = '<ul><li>Item 1<ul><li>Subitem</li></ul></li><li>Item 2</li></ul>';
    const nestedItem = root.querySelector('ul ul li');
    const range = document.createRange();
    range.selectNodeContents(nestedItem);
    range.collapse(true);
    selection.setRange(range);

    toggleList(root, selection, 'ol');

    expect(root.innerHTML).toBe(
      '<ul><li>Item 1<ol><li>Subitem</li></ol></li><li>Item 2</li></ul>',
    );
  });

  it('converts a nested numbered item into a bullet list without changing the outer list', () => {
    root.innerHTML = '<ol><li>Item 1<ol><li>Subitem</li></ol></li><li>Item 2</li></ol>';
    const nestedItem = root.querySelector('ol ol li');
    const range = document.createRange();
    range.selectNodeContents(nestedItem);
    range.collapse(true);
    selection.setRange(range);

    toggleList(root, selection, 'ul');

    expect(root.innerHTML).toBe(
      '<ol><li>Item 1<ul><li>Subitem</li></ul></li><li>Item 2</li></ol>',
    );
  });

  it('indents a bullet item and then turns the nested list into a numbered list', () => {
    root.innerHTML = '<ul><li>Item 1</li><li>Subitem</li><li>Item 2</li></ul>';
    const subitem = root.querySelectorAll('li')[1];
    const range = document.createRange();
    range.selectNodeContents(subitem);
    range.collapse(true);
    selection.setRange(range);

    indentListItem(root, selection);
    toggleList(root, selection, 'ol');

    expect(root.innerHTML).toBe(
      '<ul><li>Item 1<ol><li>Subitem</li></ol></li><li>Item 2</li></ul>',
    );
  });

  it('indents a sibling into an existing nested numbered list', () => {
    root.innerHTML = '<ul><li>Item 1<ol><li>Subitem</li></ol></li><li>Another</li></ul>';
    const sibling = root.querySelectorAll(':scope > ul > li')[1];
    const range = document.createRange();
    range.selectNodeContents(sibling);
    range.collapse(true);
    selection.setRange(range);

    indentListItem(root, selection);

    expect(root.innerHTML).toBe(
      '<ul><li>Item 1<ol><li>Subitem</li><li>Another</li></ol></li></ul>',
    );
  });

  it('does not indent the first list item', () => {
    root.innerHTML = '<ul><li>Only</li></ul>';
    const item = root.querySelector('li');
    const range = document.createRange();
    range.selectNodeContents(item);
    range.collapse(true);
    selection.setRange(range);

    expect(indentListItem(root, selection)).toBe(false);
    expect(root.innerHTML).toBe('<ul><li>Only</li></ul>');
  });

  it('does not treat an image-only list item as empty', () => {
    root.innerHTML = '<ul><li><img src="photo.png" alt=""></li></ul>';
    const item = root.querySelector('li');
    const range = document.createRange();
    range.selectNodeContents(item);
    range.collapse(true);
    selection.setRange(range);

    expect(exitEmptyListItem(root, selection)).toBe(false);
    expect(root.querySelector('img')).not.toBeNull();
  });
});
