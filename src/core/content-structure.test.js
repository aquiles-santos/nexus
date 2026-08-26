import { describe, it, expect, beforeEach } from 'vitest';
import { createSelectionManager } from './selection.js';
import {
  ensureEditableStructure,
  ensureParagraphAfterImage,
  insertImageWithStructure,
} from './content-structure.js';

describe('content-structure', () => {
  /** @type {HTMLElement} */
  let root;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('creates a default paragraph when the root is empty', () => {
    const selection = createSelectionManager(root);
    ensureEditableStructure(root, selection);

    expect(root.innerHTML).toBe('<p><br></p>');
    expect(selection.getRange()?.startContainer).toBe(root.querySelector('p'));
  });

  it('wraps orphan text nodes in a paragraph', () => {
    root.appendChild(document.createTextNode('orphan'));
    const selection = createSelectionManager(root);

    ensureEditableStructure(root, selection);

    expect(root.innerHTML).toBe('<p>orphan</p>');
  });

  it('restores a default paragraph after removing the only image', () => {
    const image = document.createElement('img');
    image.src = '/photo.png';
    image.alt = 'photo';
    root.appendChild(image);
    const selection = createSelectionManager(root);

    image.remove();
    ensureEditableStructure(root, selection);

    expect(root.innerHTML).toBe('<p><br></p>');
    expect(selection.getRange()?.startContainer).toBe(root.querySelector('p'));
  });

  it('collapses consecutive empty paragraphs', () => {
    root.innerHTML = '<p><br></p><p><br></p>';
    ensureEditableStructure(root, null);

    expect(root.innerHTML).toBe('<p><br></p>');
  });

  it('keeps the caret inside a paragraph after collapsing empty blocks', () => {
    root.innerHTML = '<p><br></p><p><br></p>';
    const selection = createSelectionManager(root);
    const trailingParagraph = root.querySelector('p:last-of-type');
    const range = document.createRange();
    range.setStart(trailingParagraph, 0);
    range.collapse(true);
    selection.setRange(range);

    ensureEditableStructure(root, selection);

    expect(root.innerHTML).toBe('<p><br></p>');
    expect(selection.getRange()?.startContainer).toBe(root.querySelector('p'));
  });

  it('restores paragraph structure after removing an image block', () => {
    root.innerHTML = '<p><img src="/photo.png" alt="photo"></p><p><br></p>';
    const selection = createSelectionManager(root);
    const trailingParagraph = root.querySelector('p:last-of-type');
    const range = document.createRange();
    range.setStart(trailingParagraph, 0);
    range.collapse(true);
    selection.setRange(range);

    root.querySelector('img')?.remove();
    ensureEditableStructure(root, selection);

    expect(root.innerHTML).toBe('<p><br></p>');
    expect(selection.getRange()?.startContainer).toBe(root.querySelector('p'));
  });

  it('wraps orphan text inserted at the root during input normalization', () => {
    root.appendChild(document.createTextNode('Texto'));
    const selection = createSelectionManager(root);
    const textNode = root.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error('Expected text node');
    }

    const range = document.createRange();
    range.setStart(textNode, textNode.length);
    range.collapse(true);
    selection.setRange(range);

    ensureEditableStructure(root, selection);

    expect(root.innerHTML).toBe('<p>Texto</p>');
    expect(root.querySelector('p')?.textContent).toBe('Texto');
  });

  it('removes placeholder breaks after text is entered', () => {
    root.innerHTML = '<p>Texto<br></p>';
    ensureEditableStructure(root, null);

    expect(root.innerHTML).toBe('<p>Texto</p>');
  });

  it('does not move the caret when normalizing existing content', () => {
    root.innerHTML = '<p>First</p><p>Second</p>';
    const selection = createSelectionManager(root);
    const secondParagraph = root.querySelector('p:last-of-type');
    const textNode = secondParagraph?.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error('Expected text node');
    }

    const range = document.createRange();
    range.setStart(textNode, 3);
    range.collapse(true);
    selection.setRange(range);

    ensureEditableStructure(root, selection);

    expect(selection.getRange()?.startContainer).toBe(textNode);
    expect(selection.getRange()?.startOffset).toBe(3);
  });

  it('places the caret in a trailing paragraph after inserting an image', () => {
    root.innerHTML = '<p><br></p>';
    const selection = createSelectionManager(root);
    const paragraph = root.querySelector('p');
    const range = document.createRange();
    range.setStart(root, 0);
    range.collapse(true);
    selection.setRange(range);

    const image = document.createElement('img');
    image.src = '/photo.png';
    image.alt = 'photo';
    insertImageWithStructure(image, range, root, selection);

    expect(root.innerHTML).toBe('<p><img src="/photo.png" alt="photo"></p><p><br></p>');
    expect(selection.getRange()?.startContainer).toBe(root.querySelector('p:last-of-type'));
  });

  it('adds a trailing paragraph after an image already wrapped in a paragraph', () => {
    root.innerHTML = '<p><img src="/photo.png" alt="photo"></p>';
    const selection = createSelectionManager(root);
    const image = root.querySelector('img');
    if (!(image instanceof HTMLImageElement)) {
      throw new Error('Expected image');
    }

    ensureParagraphAfterImage(image, selection);

    expect(root.innerHTML).toBe(
      '<p><img src="/photo.png" alt="photo"></p><p><br></p>',
    );
    expect(selection.getRange()?.startContainer).toBe(root.querySelector('p:last-of-type'));
  });
});
