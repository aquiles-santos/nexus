import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUndoManager } from './undo-manager.js'

describe('undo-manager', () => {
  /** @type {HTMLElement} */
  let root

  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
    root = document.createElement('div')
    root.innerHTML = '<p>Initial</p>'
    document.body.appendChild(root)
  })

  it('records and undoes snapshots', () => {
    const undo = createUndoManager(root, () => null)
    undo.reset()

    root.innerHTML = '<p>Changed</p>'
    undo.record()

    expect(undo.undo()).toBe(true)
    expect(root.innerHTML).toBe('<p>Initial</p>')
  })

  it('redoes after undo', () => {
    const undo = createUndoManager(root, () => null)
    undo.reset()

    root.innerHTML = '<p>Changed</p>'
    undo.record()

    undo.undo()
    expect(undo.redo()).toBe(true)
    expect(root.innerHTML).toBe('<p>Changed</p>')
  })

  it('debounces input recording', () => {
    const undo = createUndoManager(root, () => null)
    undo.reset()

    root.innerHTML = '<p>Typing</p>'
    undo.recordInput()
    undo.recordInput()

    vi.advanceTimersByTime(300)
    expect(undo.canUndo()).toBe(true)
  })

  it('dispatches bookmark restore event', () => {
    const bookmark = { start: { path: [0], offset: 0 }, end: { path: [0], offset: 0 } }
    const undo = createUndoManager(root, () => bookmark)
    undo.reset()

    const handler = vi.fn()
    root.addEventListener('nexus:restore-bookmark', handler)

    root.innerHTML = '<p>New</p>'
    undo.record()
    undo.undo()

    expect(handler).toHaveBeenCalled()
  })

  it('cancels pending input timer on destroy', () => {
    const undo = createUndoManager(root, () => null)
    undo.reset()

    root.innerHTML = '<p>Typing</p>'
    undo.recordInput()
    undo.destroy()

    vi.advanceTimersByTime(300)
    expect(undo.canUndo()).toBe(false)
  })
})
