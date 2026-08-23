import { describe, it, expect, beforeEach } from 'vitest'
import { createSelectionManager } from './selection.js'
import { createFormatter } from './formatter.js'

describe('formatter', () => {
  /** @type {HTMLElement} */
  let root

  beforeEach(() => {
    document.body.innerHTML = ''
    root = document.createElement('div')
    root.innerHTML = '<p>Hello world</p>'
    document.body.appendChild(root)
  })

  function selectText(textNode, start, end) {
    const range = document.createRange()
    range.setStart(textNode, start)
    range.setEnd(textNode, end)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  it('wraps selection with strong tag', () => {
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('p').firstChild

    selectText(textNode, 0, 5)
    formatter.toggleInline('strong')

    expect(root.innerHTML).toBe('<p><strong>Hello</strong> world</p>')
  })

  it('unwraps existing inline tag', () => {
    root.innerHTML = '<p><strong>Hello</strong> world</p>'
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('strong').firstChild

    selectText(textNode, 0, 5)
    formatter.toggleInline('strong')

    expect(root.innerHTML).toBe('<p>Hello world</p>')
  })

  it('toggles pending marks on collapsed selection', () => {
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    formatter.toggleInline('em')
    expect(formatter.isActive('italic')).toBe(true)
  })

  it('changes block format to heading', () => {
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    formatter.formatBlock('h1')
    expect(root.innerHTML).toBe('<h1>Hello world</h1>')
  })

  it('reverts heading back to paragraph', () => {
    root.innerHTML = '<h1>Hello world</h1>'
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('h1').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    formatter.formatBlock('h1')
    expect(root.innerHTML).toBe('<p>Hello world</p>')
  })

  it('deactivates after removing inline style from selection', () => {
    root.innerHTML = '<p><em>Hello world</em></p>'
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('em').firstChild

    selectText(textNode, 0, 11)
    formatter.toggleInline('em')

    expect(root.innerHTML).toBe('<p>Hello world</p>')
    expect(formatter.isActive('italic')).toBe(false)
  })

  it('does not keep pending mark active after clearing it', () => {
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    formatter.toggleInline('em')
    formatter.clearPendingMarks()

    expect(formatter.isActive('italic')).toBe(false)
  })

  it('unwraps inline style when selection spans mixed content', () => {
    root.innerHTML = '<p><em>Hello</em> world</p>'
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const paragraph = root.querySelector('p')

    const range = document.createRange()
    range.setStart(paragraph, 0)
    range.setEnd(paragraph, paragraph.childNodes.length)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    formatter.toggleInline('em')

    expect(root.querySelector('em')).toBeNull()
    expect(formatter.isActive('italic')).toBe(false)
  })

  it('keeps other inline styles active after removing one', () => {
    root.innerHTML = '<p><strong><em><u>Hello</u></em></strong></p>'
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('u').firstChild

    selectText(textNode, 0, 5)
    formatter.toggleInline('strong')

    expect(root.querySelector('strong')).toBeNull()
    expect(root.querySelector('em')).not.toBeNull()
    expect(root.querySelector('u')).not.toBeNull()
    expect(formatter.isActive('bold')).toBe(false)
    expect(formatter.isActive('italic')).toBe(true)
    expect(formatter.isActive('underline')).toBe(true)
  })

  it('reports the active block tag', () => {
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    expect(formatter.getActiveBlockTag()).toBe('p')
    formatter.formatBlock('h1')
    expect(formatter.getActiveBlockTag()).toBe('h1')
  })

  it('does not create disallowed block tags', () => {
    const selection = createSelectionManager(root)
    const formatter = createFormatter(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    formatter.formatBlock('script')
    expect(root.querySelector('script')).toBeNull()
    expect(root.innerHTML).toBe('<p>Hello world</p>')
  })
})
