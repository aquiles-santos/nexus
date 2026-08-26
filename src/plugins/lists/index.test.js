import { describe, it, expect, beforeEach } from 'vitest';
import { createNexusEditor } from '../../editor/nexus-editor.js';
import { pluginBasicFormats } from '../basic-formats/index.js';
import { pluginLists } from './index.js';

describe('plugin-lists', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('registers list toolbar buttons', () => {
    const { element: editor } = createNexusEditor({
      toolbar: ['insertUnorderedList', 'insertOrderedList'],
    });
    document.body.appendChild(editor);
    editor.use(pluginLists);

    expect(
      editor.toolbar.shadowRoot.querySelector('[data-command="insertUnorderedList"]'),
    ).not.toBeNull();
    expect(
      editor.toolbar.shadowRoot.querySelector('[data-command="insertOrderedList"]'),
    ).not.toBeNull();
  });

  it('creates an unordered list from a paragraph', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.setContent('<p>Item one</p>');

    const textNode = editor.contentElement.querySelector('p').firstChild;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('insertUnorderedList');

    expect(editor.getContent({ format: 'html' })).toBe(
      '<ul><li>Item one</li></ul>',
    );
  });

  it('removes list formatting without deleting content', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.setContent('<ul><li>Alpha</li><li>Beta</li></ul>');

    const range = document.createRange();
    range.selectNodeContents(editor.contentElement);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('insertUnorderedList');

    expect(editor.getContent({ format: 'html' })).toBe('<p>Alpha</p><p>Beta</p>');
    expect(editor.contentElement.querySelector('p')?.textContent).toBe('Alpha');
  });

  it('creates one ordered list for multiple paragraphs', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.setContent('<p>One</p><p>Two</p>');

    const range = document.createRange();
    range.selectNodeContents(editor.contentElement);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('insertOrderedList');

    expect(editor.getContent({ format: 'html' })).toBe('<ol><li>One</li><li>Two</li></ol>');
  });

  it('converts a bullet list to a numbered list without nesting', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.setContent('<ul><li>Alpha</li><li>Beta</li></ul>');

    const range = document.createRange();
    range.selectNodeContents(editor.contentElement);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('insertOrderedList');

    expect(editor.getContent({ format: 'html' })).toBe('<ol><li>Alpha</li><li>Beta</li></ol>');
  });

  it('turns a nested bullet item into a numbered list', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.setContent('<ul><li>Item 1<ul><li>Subitem</li></ul></li><li>Item 2</li></ul>');

    const nestedItem = editor.contentElement.querySelector('ul ul li');
    const range = document.createRange();
    range.selectNodeContents(nestedItem);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('insertOrderedList');

    expect(editor.getContent({ format: 'html' })).toBe(
      '<ul><li>Item 1<ol><li>Subitem</li></ol></li><li>Item 2</li></ul>',
    );
  });

  it('removes a numbered list after conversion without leftover nodes', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.setContent('<ul><li>Alpha</li><li>Beta</li></ul>');

    const range = document.createRange();
    range.selectNodeContents(editor.contentElement);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('insertOrderedList');
    range.selectNodeContents(editor.contentElement);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    editor.execCommand('insertOrderedList');

    expect(editor.getContent({ format: 'html' })).toBe('<p>Alpha</p><p>Beta</p>');
  });

  it.each([
    ['bold', 'strong'],
    ['italic', 'em'],
    ['underline', 'u'],
  ])('does not add empty list items when applying %s', (command, tag) => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.use(pluginBasicFormats);
    editor.setContent('<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>');

    const items = editor.contentElement.querySelectorAll('li');
    const range = document.createRange();
    range.setStart(items[0], 0);
    range.setEnd(items[2], items[2].childNodes.length);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand(command);

    const listItems = [...editor.contentElement.querySelectorAll('ul > li')];
    expect(listItems).toHaveLength(3);
    expect(editor.contentElement.querySelector(`ul > ${tag}`)).toBeNull();
    expect(listItems.map((item) => item.textContent)).toEqual(['Item 1', 'Item 2', 'Item 3']);
    expect(listItems.every((item) => item.querySelector(tag))).toBe(true);
  });

  it('keeps list markers when the first item becomes a heading', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLists);
    editor.use(pluginBasicFormats);
    editor.setContent('<ul><li>Title</li><li>Body</li></ul>');

    const firstItemText = editor.contentElement.querySelector('li').firstChild;
    const range = document.createRange();
    range.setStart(firstItemText, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('formatBlock', 'h1');

    expect(editor.getContent({ format: 'html' })).toBe(
      '<ul><li><h1>Title</h1></li><li>Body</li></ul>',
    );
    expect(editor.contentElement.querySelectorAll('ul > li')).toHaveLength(2);
  });
});
