import { describe, it, expect, beforeEach } from 'vitest'
import { createSelectionManager } from './selection.js'

describe('selection', () => {
  /** @type {HTMLElement} */
  let root

  beforeEach(() => {
    document.body.innerHTML = ''
    root = document.createElement('div')
    root.innerHTML = '<p>Hello <strong>world</strong></p>'
    document.body.appendChild(root)
  })

  it('detects when selection is within a tag', () => {
    const selection = createSelectionManager(root)
    const textNode = root.querySelector('strong').firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 5)

    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)

    expect(selection.isWithin('strong')).toBe(true)
    expect(selection.isWithin('em')).toBe(false)
  })

  it('saves and restores bookmark', () => {
    const selection = createSelectionManager(root)
    const textNode = root.querySelector('p').firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 5)

    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)

    const bookmark = selection.saveBookmark()
    expect(bookmark).not.toBeNull()

    root.innerHTML = '<p>Changed content</p>'
    selection.restoreBookmark(bookmark)

    const restored = selection.getRange()
    expect(restored).not.toBeNull()
    expect(restored.toString()).toBe('Chang')
  })

  it('returns null bookmark when no selection in root', () => {
    const selection = createSelectionManager(root)
    window.getSelection().removeAllRanges()
    expect(selection.saveBookmark()).toBeNull()
  })

  it('ignores detached nodes when checking inline context', () => {
    const selection = createSelectionManager(root)
    const detached = document.createElement('em')
    detached.textContent = 'Hello'

    window.getSelection().removeAllRanges()
    const range = document.createRange()
    range.setStart(detached.firstChild, 0)
    range.collapse(true)
    window.getSelection().addRange(range)

    expect(selection.isWithin('em')).toBe(false)
  })

  it('detects inline context from range endpoints', () => {
    const selection = createSelectionManager(root)
    const textNode = root.querySelector('strong').firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 5)

    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    expect(selection.isWithin('strong')).toBe(true)
  })
})
