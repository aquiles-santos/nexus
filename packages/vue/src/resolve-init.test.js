import { describe, it, expect } from 'vitest'
import { resolveInit, shouldApplyModelValue } from './resolve-init.js'

describe('resolveInit', () => {
  it('copies init and lets shortcuts replace matching fields', () => {
    expect(
      resolveInit({
        init: { height: 200, plugins: 'basic-formats', toolbar: 'bold' },
        height: 400,
        plugins: 'lists',
        toolbar: 'insertUnorderedList',
      }),
    ).toEqual({
      height: 400,
      plugins: 'lists',
      toolbar: 'insertUnorderedList',
    })
  })

  it('keeps init when shortcuts are omitted', () => {
    expect(resolveInit({ init: { plugins: 'link', height: 320 } })).toEqual({
      plugins: 'link',
      height: 320,
    })
  })

  it('treats a missing init as an empty object', () => {
    expect(resolveInit({ plugins: 'basic-formats' })).toEqual({
      plugins: 'basic-formats',
    })
  })
})

describe('shouldApplyModelValue', () => {
  it('skips when the incoming html already matches getContent', () => {
    const editor = {
      getContent: () => '<p>Igual</p>',
    }

    expect(shouldApplyModelValue(editor, '<p>Igual</p>')).toBe(false)
    expect(shouldApplyModelValue(editor, '<p>Outro</p>')).toBe(true)
  })

  it('skips when the editor is missing or the value is not a string', () => {
    const editor = { getContent: () => '<p>A</p>' }

    expect(shouldApplyModelValue(null, '<p>A</p>')).toBe(false)
    expect(shouldApplyModelValue(editor, undefined)).toBe(false)
    expect(shouldApplyModelValue(editor, null)).toBe(false)
  })
})
