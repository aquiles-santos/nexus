import { describe, it, expect } from 'vitest';
import { pluginPasteClean } from './index.js';
import { sanitizeIncomingHtml } from '../../data/sanitizer.js';
import { createEventBus } from '../../shared/event-bus.js';

describe('plugin-paste-clean', () => {
  it('cleans Word markup through the paste transform bus', () => {
    const bus = createEventBus();
    const editor = { bus };
    pluginPasteClean.init(editor);

    const html = '<p><b>Title</b><span style="color:red">Text</span></p>';
    expect(sanitizeIncomingHtml(html, bus)).toBe('<p><strong>Title</strong>Text</p>');

    pluginPasteClean.destroy(editor);
  });
});
