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

  it('adds plugins from later configureNexusEditor calls without unloading existing ones', () => {
    const { element: editor } = createNexusEditor({
      plugins: 'basic-formats',
      toolbar: ['bold', 'insertUnorderedList'],
    })
    document.body.appendChild(editor)

    configureNexusEditor(editor, { plugins: 'lists' })

    expect(editor.config.plugins).toEqual(['basic-formats', 'lists'])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="insertUnorderedList"]')).not.toBeNull()
  })

  it('stores later plugin names on element.configure without loading the catalog', () => {
    const { element: editor } = createNexusEditor({
      plugins: 'basic-formats',
      toolbar: ['bold', 'insertUnorderedList'],
    })
    document.body.appendChild(editor)

    editor.configure({ plugins: 'lists' })

    expect(editor.config.plugins).toEqual(['basic-formats', 'lists'])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="insertUnorderedList"]')).toBeNull()
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

describe('wrapper contract (createNexusEditor lifecycle)', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  function mergeWrapperInit(init = {}, shortcuts = {}) {
    const merged = { ...init }
    if (shortcuts.plugins !== undefined) merged.plugins = shortcuts.plugins
    if (shortcuts.toolbar !== undefined) merged.toolbar = shortcuts.toolbar
    if (shortcuts.height !== undefined) merged.height = shortcuts.height
    if (shortcuts.placeholder !== undefined) merged.placeholder = shortcuts.placeholder
    return merged
  }

  it('applies shortcut fields over init the way a Vue wrapper would merge props', () => {
    const { element: editor, destroy } = createNexusEditor(
      mergeWrapperInit(
        { height: 200, plugins: 'basic-formats', toolbar: 'bold' },
        { height: 400, plugins: 'lists', toolbar: 'insertUnorderedList' },
      ),
    )
    document.body.appendChild(editor)

    expect(editor.config.height).toBe('400px')
    expect(editor.config.plugins).toEqual(['lists'])
    expect(editor.config.toolbar).toEqual(['insertUnorderedList'])
    destroy()
  })

  it('setContent on mount and contentElement input drive getContent for v-model', () => {
    const { element: editor, destroy } = createNexusEditor()
    const host = document.createElement('div')
    document.body.appendChild(host)
    host.appendChild(editor)

    editor.setContent('<p>Rascunho</p>')
    expect(editor.getContent({ format: 'html' })).toBe('<p>Rascunho</p>')

    const emitted = []
    const handleInput = () => {
      emitted.push(editor.getContent({ format: 'html' }))
    }
    editor.contentElement.addEventListener('input', handleInput)

    editor.contentElement.innerHTML = '<p>Editado</p>'
    editor.contentElement.dispatchEvent(new InputEvent('input', { bubbles: true }))

    expect(emitted.at(-1)).toBe('<p>Editado</p>')

    editor.contentElement.removeEventListener('input', handleInput)
    destroy()
    expect(document.body.contains(editor)).toBe(false)
  })
})
