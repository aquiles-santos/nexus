import { describe, it, expect, vi } from 'vitest'
import { createPluginRegistry, getShortcutKey } from './plugin-registry.js'

describe('plugin-registry', () => {
  it('registers plugin commands and shortcuts', () => {
    const editor = { execCommand: vi.fn() }
    const registry = createPluginRegistry(editor)

    const plugin = {
      name: 'test-plugin',
      init: vi.fn(),
      commands: {
        bold: () => editor.execCommand('bold'),
      },
      shortcuts: {
        'Ctrl+B': 'bold',
      },
      destroy: vi.fn(),
    }

    registry.use(plugin)
    expect(plugin.init).toHaveBeenCalledWith(editor)
    expect(registry.execCommand('bold')).toBe(true)
  })

  it('exposes registered shortcuts for the editor keydown handler', () => {
    const registry = createPluginRegistry({})

    registry.use({
      name: 'formats',
      init: () => {},
      commands: { bold: () => {} },
      shortcuts: { 'Ctrl+B': 'bold' },
      destroy: () => {},
    })

    expect(registry.getShortcuts().get('Ctrl+B')).toBe('bold')
  })

  it('disables and re-enables plugins', () => {
    const editor = {}
    const registry = createPluginRegistry(editor)
    const destroy = vi.fn()

    registry.use({
      name: 'test',
      init: vi.fn(),
      commands: { test: () => {} },
      destroy,
    })

    registry.disable('test')
    expect(destroy).toHaveBeenCalledWith(editor)
    expect(registry.execCommand('test')).toBe(false)

    registry.enable('test')
    expect(registry.execCommand('test')).toBe(true)
  })

  it('builds shortcut key from keyboard event', () => {
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true })
    expect(getShortcutKey(event)).toBe('Ctrl+Shift+Z')
  })
})
