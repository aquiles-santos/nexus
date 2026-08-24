import { describe, it, expect, beforeEach } from 'vitest';
import { createNexusEditor } from '../../editor/nexus-editor.js';
import { pluginLink } from './index.js';

describe('plugin-link', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('registers the link shortcut', () => {
    expect(pluginLink.shortcuts?.['Ctrl+K']).toBe('insertLink');
  });

  it('inserts a safe link with target blank', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLink);
    editor.setContent('<p>Example</p>');

    const textNode = editor.contentElement.querySelector('p').firstChild;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('applyLink', {
      href: 'https://example.com',
      text: 'Example',
    });

    const anchor = editor.contentElement.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('rejects javascript hrefs', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginLink);
    editor.setContent('<p>Example</p>');

    const textNode = editor.contentElement.querySelector('p').firstChild;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    editor.execCommand('applyLink', {
      href: 'javascript:alert(1)',
      text: 'Example',
    });

    expect(editor.contentElement.querySelector('a')).toBeNull();
  });
});
