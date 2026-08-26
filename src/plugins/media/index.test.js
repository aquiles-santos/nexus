import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNexusEditor } from '../../editor/nexus-editor.js';
import { createPluginMedia, pluginMedia } from './index.js';

function focusEditor(editor) {
  const content = editor.contentElement;
  content.focus();
  const range = document.createRange();
  range.selectNodeContents(content);
  range.collapse(true);
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(range);
}

describe('plugin-media', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    URL.createObjectURL = vi.fn(() => 'blob:mock/photo.png');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete URL.createObjectURL;
  });

  it('registers the image toolbar button', () => {
    const { element: editor } = createNexusEditor({ toolbar: ['insertImage'] });
    document.body.appendChild(editor);
    editor.use(pluginMedia);

    expect(editor.toolbar.shadowRoot.querySelector('[data-command="insertImage"]')).not.toBeNull();
  });

  it('clears the empty placeholder after inserting an image', async () => {
    const { element: editor } = createNexusEditor({ toolbar: ['insertImage'] });
    document.body.appendChild(editor);
    editor.use(pluginMedia);
    focusEditor(editor);

    expect(editor.contentElement.hasAttribute('data-empty')).toBe(true);

    const fileInput = document.querySelector('[data-media-input]');
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', {
      type: 'image/png',
    });
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [file],
    });

    fileInput.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(editor.contentElement.querySelector('img')).not.toBeNull();
    });

    expect(editor.contentElement.hasAttribute('data-empty')).toBe(false);
    expect(editor.contentElement.querySelector('img')?.getAttribute('alt')).toBe('photo');
  });

  it('removes the selected image when delete is clicked', async () => {
    const { element: editor } = createNexusEditor({ toolbar: ['insertImage'] });
    document.body.appendChild(editor);
    editor.use(pluginMedia);
    focusEditor(editor);

    const fileInput = document.querySelector('[data-media-input]');
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', {
      type: 'image/png',
    });
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [file],
    });

    fileInput.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(editor.contentElement.querySelector('img')).not.toBeNull();
    });

    const image = editor.contentElement.querySelector('img');
    image.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const deleteButton = editor.scrollerElement.querySelector('[data-delete-image]');
    expect(deleteButton).not.toBeNull();
    deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editor.contentElement.querySelector('img')).toBeNull();
    expect(editor.contentElement.hasAttribute('data-empty')).toBe(true);
    expect(editor.getContent({ format: 'html' })).toBe('<p><br></p>');
  });

  it('keeps typed text inside a paragraph after deleting an image', async () => {
    const { element: editor } = createNexusEditor({ toolbar: ['insertImage'] });
    document.body.appendChild(editor);
    editor.use(pluginMedia);
    focusEditor(editor);

    const fileInput = document.querySelector('[data-media-input]');
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', {
      type: 'image/png',
    });
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [file],
    });

    fileInput.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(editor.contentElement.querySelector('img')).not.toBeNull();
    });

    const image = editor.contentElement.querySelector('img');
    image.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const deleteButton = editor.scrollerElement.querySelector('[data-delete-image]');
    deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editor.contentElement.querySelector('img')).toBeNull();
    expect(editor.getContent({ format: 'html' })).toBe('<p><br></p>');

    editor.contentElement.focus();
    const paragraph = editor.contentElement.querySelector('p');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    paragraph.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: 'Texto',
      }),
    );

    const textNode = document.createTextNode('Texto');
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.contentElement.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(editor.getContent({ format: 'html' })).toBe('<p>Texto</p>');
    expect(editor.contentElement.querySelector('p')?.textContent).toBe('Texto');
  });

  it('allows image delete button clicks without scroller intercepting mousedown', async () => {
    const { element: editor } = createNexusEditor({ toolbar: ['insertImage'] });
    document.body.appendChild(editor);
    editor.use(pluginMedia);
    focusEditor(editor);

    const fileInput = document.querySelector('[data-media-input]');
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', {
      type: 'image/png',
    });
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [file],
    });

    fileInput.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(editor.contentElement.querySelector('img')).not.toBeNull();
    });

    const image = editor.contentElement.querySelector('img');
    image.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const deleteButton = editor.scrollerElement.querySelector('[data-delete-image]');
    deleteButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editor.contentElement.querySelector('img')).toBeNull();
  });

  it('opens an error dialog when image upload fails', async () => {
    const adapter = {
      upload: vi.fn(async () => {
        throw new Error('Only PNG, JPEG, GIF, and WebP images are supported.');
      }),
    };
    const { element: editor } = createNexusEditor({ toolbar: ['insertImage'] });
    document.body.appendChild(editor);
    editor.use(createPluginMedia(adapter));
    focusEditor(editor);

    const fileInput = document.querySelector('[data-media-input]');
    const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [file],
    });

    fileInput.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(editor.modal.dialog.open).toBe(true);
    });

    expect(editor.modal.dialog.textContent).toMatch(/png|jpeg|gif|webp/i);
    expect(editor.contentElement.querySelector('img')).toBeNull();
  });
});
