import { describe, it, expect } from 'vitest';
import { cleanWordHtml, sanitizeIncomingHtml } from './sanitizer.js';
import { serializeAst } from './ast-serializer.js';
import { formatHtmlPretty, serializeHtml } from './html-serializer.js';
import { createEventBus } from '../shared/event-bus.js';

describe('cleanWordHtml', () => {
  it('maps bold and italic tags and removes inline styles', () => {
    const input = '<p><b>Title</b> <span style="color:red">text</span></p>';
    expect(cleanWordHtml(input)).toBe('<p><strong>Title</strong> text</p>');
  });

  it('removes Word-specific tags', () => {
    const input = '<!--StartFragment--><p><o:p></o:p>Hello</p>';
    expect(cleanWordHtml(input)).toBe('<p>Hello</p>');
  });
});

describe('sanitizeIncomingHtml', () => {
  it('strips unsafe attributes after paste transforms', () => {
    const html = '<p><img src="x" onerror="alert(1)"></p>';
    expect(sanitizeIncomingHtml(html)).toBe('<p><img src="x"></p>');
  });

  it('allows bus handlers to transform html before schema filtering', () => {
    const bus = createEventBus();
    bus.on('paste:transform', (detail) => {
      detail.html = detail.html.replace('Docs', 'Nexus');
    });

    expect(sanitizeIncomingHtml('<p>Docs</p>', bus)).toBe('<p>Nexus</p>');
  });

  it('keeps a numbered list nested inside a bullet list item', () => {
    const html = '<ul><li>Item 1<ol><li>Subitem</li></ol></li><li>Item 2</li></ul>';
    expect(sanitizeIncomingHtml(html)).toBe(html);
  });
});

describe('serializeAst', () => {
  it('serializes sanitized content to json ast', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Hello <strong>world</strong></p>';

    expect(serializeAst(root)).toEqual({
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          attrs: {},
          children: [
            { type: 'text', value: 'Hello ' },
            {
              type: 'element',
              tag: 'strong',
              attrs: {},
              children: [{ type: 'text', value: 'world' }],
            },
          ],
        },
      ],
    });
  });
});

describe('serializeHtml', () => {
  it('pretty-prints html when requested', () => {
    expect(formatHtmlPretty('<p>Hello</p><p>World</p>')).toBe(
      '<p>Hello</p>\n<p>World</p>',
    );
  });

  it('returns compact html from content element', () => {
    const content = document.createElement('div');
    content.setAttribute('data-nexus-content', '');
    content.innerHTML = '<p>Hello</p>';

    expect(serializeHtml(content)).toBe('<p>Hello</p>');
  });
});

