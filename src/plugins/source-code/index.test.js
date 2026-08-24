import { describe, it, expect, beforeEach } from 'vitest';
import { createNexusEditor } from '../../editor/nexus-editor.js';
import { getSourceHtml, pluginSourceCode } from './index.js';

describe('plugin-source-code', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('toggles source mode and round-trips html', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginSourceCode);
    editor.setContent('<p>Hello</p>');

    editor.execCommand('toggleSource');
    expect(editor.getAttribute('data-mode')).toBe('source');

    const sourceInput = editor.querySelector('[data-source-input]');
    expect(sourceInput).toBeInstanceOf(HTMLTextAreaElement);
    sourceInput.value = '<p>Updated</p>';

    editor.execCommand('toggleSource');
    expect(editor.getAttribute('data-mode')).toBeNull();
    expect(editor.getContent({ format: 'html' })).toBe('<p>Updated</p>');
  });

  it('sanitizes html returned from getSourceHtml', () => {
    const { element: editor } = createNexusEditor();
    document.body.appendChild(editor);
    editor.use(pluginSourceCode);
    editor.setContent('<p>Hello</p>');

    editor.execCommand('toggleSource');
    const sourceInput = editor.querySelector('[data-source-input]');
    sourceInput.value = '<p>Hi<script>alert(1)</script></p>';

    expect(getSourceHtml(editor)).toBe('<p>Hi</p>');
  });
});
