import { describe, it, expect, beforeEach } from 'vitest'
import { createSelectionManager } from './selection.js'
import { createCommands } from './commands.js'

describe('commands', () => {
  /** @type {HTMLElement} */
  let root

  beforeEach(() => {
    document.body.innerHTML = ''
    root = document.createElement('div')
    root.innerHTML = '<p>Test content</p>'
    document.body.appendChild(root)
  })

  it('executes bold command', () => {
    const selection = createSelectionManager(root)
    const commands = createCommands(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 4)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    commands.exec('bold')
    expect(root.innerHTML).toBe('<p><strong>Test</strong> content</p>')
  })

  it('executes formatBlock command', () => {
    const selection = createSelectionManager(root)
    const commands = createCommands(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    commands.exec('formatBlock', 'h2')
    expect(root.innerHTML).toBe('<h2>Test content</h2>')
  })

  it('returns false for unknown command', () => {
    const selection = createSelectionManager(root)
    const commands = createCommands(root, selection)
    expect(commands.exec('unknown')).toBe(false)
  })

  it('ignores disallowed formatBlock tags', () => {
    const selection = createSelectionManager(root)
    const commands = createCommands(root, selection)
    const textNode = root.querySelector('p').firstChild

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    commands.exec('formatBlock', 'script')
    expect(root.querySelector('script')).toBeNull()
    expect(root.innerHTML).toBe('<p>Test content</p>')
  })
})
