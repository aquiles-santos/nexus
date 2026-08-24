import { describe, it, expect } from 'vitest';
import { parseHtml } from './html-parser.js';

describe('parseHtml', () => {
  it('returns a fragment with sanitized nodes', () => {
    const fragment = parseHtml('<p>Hi<script>alert(1)</script><img src="x" onerror="alert(1)"></p>');

    expect(fragment).toBeInstanceOf(DocumentFragment);
    expect(fragment.querySelector('script')).toBeNull();
    expect(fragment.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(fragment.textContent).toBe('Hi');
  });

  it('keeps allowed markup', () => {
    const fragment = parseHtml('<p>Hello <strong>world</strong></p>');

    expect(fragment.querySelector('p')?.innerHTML).toBe('Hello <strong>world</strong>');
  });
});
