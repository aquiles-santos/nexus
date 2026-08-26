import { describe, it, expect } from 'vitest'
import {
  DEFAULT_EDITOR_HEIGHT,
  DEFAULT_PLACEHOLDER,
  DEFAULT_TOOLBAR,
  TOOLBAR_SEPARATOR,
  normalizeHeight,
  normalizePlaceholder,
  normalizeToolbar,
  resolveEditorConfig,
} from './editor-config.js'

describe('editor-config', () => {
  it('applies default height and toolbar when no config is provided', () => {
    expect(resolveEditorConfig()).toEqual({
      height: DEFAULT_EDITOR_HEIGHT,
      toolbar: DEFAULT_TOOLBAR,
      placeholder: DEFAULT_PLACEHOLDER,
    })
  })

  it('normalizes numeric height to pixels', () => {
    expect(normalizeHeight(400)).toBe('400px')
    expect(normalizeHeight('320')).toBe('320px')
  })

  it('accepts valid css length strings', () => {
    expect(normalizeHeight('50vh')).toBe('50vh')
    expect(normalizeHeight('100%')).toBe('100%')
  })

  it('falls back to the default height for invalid values', () => {
    expect(normalizeHeight(0)).toBe(DEFAULT_EDITOR_HEIGHT)
    expect(normalizeHeight(-10)).toBe(DEFAULT_EDITOR_HEIGHT)
    expect(normalizeHeight('100px; background: red')).toBe(DEFAULT_EDITOR_HEIGHT)
    expect(normalizeHeight({ foo: 1 })).toBe(DEFAULT_EDITOR_HEIGHT)
    expect(normalizeHeight('0px')).toBe(DEFAULT_EDITOR_HEIGHT)
    expect(normalizeHeight('0')).toBe(DEFAULT_EDITOR_HEIGHT)
  })

  it('parses toolbar from a string and preserves order', () => {
    expect(normalizeToolbar('underline bold | italic')).toEqual([
      'underline',
      'bold',
      TOOLBAR_SEPARATOR,
      'italic',
    ])
  })

  it('treats an empty toolbar array as no tools', () => {
    expect(normalizeToolbar([])).toEqual([])
  })

  it('uses the default toolbar for an empty string', () => {
    expect(normalizeToolbar('')).toEqual(DEFAULT_TOOLBAR)
  })

  it('uses the default toolbar for invalid values', () => {
    expect(normalizeToolbar(42)).toEqual(DEFAULT_TOOLBAR)
  })

  it('normalizes placeholder values', () => {
    expect(normalizePlaceholder(undefined)).toBe(DEFAULT_PLACEHOLDER)
    expect(normalizePlaceholder('Escreva aqui…')).toBe('Escreva aqui…')
    expect(normalizePlaceholder(false)).toBeNull()
    expect(normalizePlaceholder(null)).toBeNull()
    expect(normalizePlaceholder('   ')).toBeNull()
  })

})
