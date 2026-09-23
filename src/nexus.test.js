import { describe, it, expect, beforeEach } from 'vitest'
import { createNexusEditor, configureNexusEditor } from './nexus.js'
import { pluginLists } from './plugins/lists/index.js'

describe('createNexusEditor (catalog factory)', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('does not register built-in plugins when plugins is omitted', () => {
    const { element: editor } = createNexusEditor()
    document.body.appendChild(editor)

    expect(editor.config.plugins).toEqual([])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).toBeNull()
  })

  it('registers catalog plugins from a names string before connect', () => {
    const { element: editor } = createNexusEditor({ plugins: 'basic-formats' })
    document.body.appendChild(editor)

    expect(editor.config.plugins).toEqual(['basic-formats'])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
  })

  it('registers mixed catalog names and plugin objects from init', () => {
    const { element: editor } = createNexusEditor({
      plugins: ['basic-formats', pluginLists],
      toolbar: ['bold', 'insertUnorderedList'],
    })
    document.body.appendChild(editor)

    expect(editor.config.plugins).toEqual(['basic-formats'])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="insertUnorderedList"]')).not.toBeNull()
  })

  it('adds plugins from later configure calls without unloading existing ones', () => {
    const { element: editor } = createNexusEditor({
      plugins: 'basic-formats',
      toolbar: ['bold', 'insertUnorderedList'],
    })
    document.body.appendChild(editor)

    editor.configure({ plugins: 'lists' })

    expect(editor.config.plugins).toEqual(['basic-formats', 'lists'])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="insertUnorderedList"]')).not.toBeNull()
  })

  it('throws when init names a plugin that is not in the catalog', () => {
    expect(() => createNexusEditor({ plugins: 'not-a-plugin' })).toThrow(
      'Unknown plugin "not-a-plugin"',
    )
  })

  it('resolves catalog names on configure for a custom element already in the page', () => {
    const editor = document.createElement('nexus-editor')
    document.body.appendChild(editor)

    configureNexusEditor(editor, { plugins: 'basic-formats' })

    expect(editor.config.plugins).toEqual(['basic-formats'])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
  })
})
