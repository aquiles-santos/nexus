import { describe, it, expect } from 'vitest'
import {
  isAllowedTag,
  isBlock,
  isInline,
  filterHtml,
  getDefaultBlockTag,
  isSafeHref,
} from './schema.js'

describe('schema', () => {
  it('identifies allowed tags', () => {
    expect(isAllowedTag('p')).toBe(true)
    expect(isAllowedTag('strong')).toBe(true)
    expect(isAllowedTag('script')).toBe(false)
  })

  it('classifies block and inline tags', () => {
    expect(isBlock('h1')).toBe(true)
    expect(isInline('em')).toBe(true)
    expect(isBlock('strong')).toBe(false)
  })

  it('returns default block tag', () => {
    expect(getDefaultBlockTag()).toBe('p')
  })

  it('removes disallowed tags while keeping text', () => {
    const result = filterHtml('<p>Hello <script>alert(1)</script><span>world</span></p>')
    expect(result).toBe('<p>Hello world</p>')
  })

  it('strips event handler attributes', () => {
    const result = filterHtml('<p onclick="evil()">text</p>')
    expect(result).toBe('<p>text</p>')
  })

  it('keeps allowed link attributes and enforces rel on blank targets', () => {
    const result = filterHtml('<p><a href="https://example.com" target="_blank">link</a></p>')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('keeps allowed image attributes', () => {
    const result = filterHtml('<p><img src="/img.png" alt="test" width="100" height="50"></p>')
    expect(result).toContain('src="/img.png"')
    expect(result).toContain('alt="test"')
  })

  it('sanitizes event handlers after unwrapping disallowed tags', () => {
    const wrapped = filterHtml('<div><img src="x" onerror="alert(1)"></div>')
    expect(wrapped).not.toContain('onerror')
    expect(wrapped).toContain('src="x"')

    const nested = filterHtml('<p><span><img src="x" onerror="alert(1)"></span></p>')
    expect(nested).not.toContain('onerror')
    expect(nested).toContain('<p>')
  })

  it('strips javascript and data urls from links and images', () => {
    const link = filterHtml('<p><a href="javascript:alert(1)">x</a></p>')
    expect(link).not.toContain('javascript:')
    expect(link).toContain('<a')

    const dataLink = filterHtml('<p><a href="data:text/html,alert(1)">x</a></p>')
    expect(dataLink).not.toContain('data:')

    const image = filterHtml('<p><img src="javascript:alert(1)"></p>')
    expect(image).not.toContain('javascript:')

    const obfuscated = filterHtml('<p><a href="java&#10;script:alert(1)">x</a></p>')
    expect(obfuscated).not.toMatch(/javascript:/i)
  })

  it('accepts safe hrefs and rejects dangerous protocols', () => {
    expect(isSafeHref('https://example.com')).toBe(true)
    expect(isSafeHref('mailto:hi@example.com')).toBe(true)
    expect(isSafeHref('/docs')).toBe(true)
    expect(isSafeHref('javascript:alert(1)')).toBe(false)
    expect(isSafeHref('java\nscript:alert(1)')).toBe(false)
    expect(isSafeHref('file:///etc/passwd')).toBe(false)
    expect(isSafeHref('ftp://example.com')).toBe(false)
    expect(isSafeHref('//evil.example')).toBe(false)
    expect(isSafeHref('')).toBe(false)
  })

  it('unwraps a list nested directly inside another list', () => {
    const result = filterHtml('<ul><ol><li>Alpha</li></ol></ul>')
    expect(result).toBe('<ul><li>Alpha</li></ul>')
  })

  it('removes empty leftover list nodes', () => {
    const result = filterHtml('<ul><ol></ol><li>Alpha</li></ul>')
    expect(result).toBe('<ul><li>Alpha</li></ul>')
  })

  it('keeps a nested list that lives inside a list item', () => {
    const result = filterHtml('<ul><li>Alpha<ol><li>Nested</li></ol></li></ul>')
    expect(result).toBe('<ul><li>Alpha<ol><li>Nested</li></ol></li></ul>')
  })
})
