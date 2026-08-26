import { describe, it, expect, beforeEach } from 'vitest'
import { createNexusEditor } from '../../editor/nexus-editor.js'
import { pluginBasicFormats } from './index.js'

describe('plugin-basic-formats', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('defines plugin contract', () => {
    expect(pluginBasicFormats.name).toBe('basic-formats')
    expect(typeof pluginBasicFormats.init).toBe('function')
    expect(typeof pluginBasicFormats.destroy).toBe('function')
    expect(pluginBasicFormats.shortcuts['Ctrl+B']).toBe('bold')
    expect(pluginBasicFormats.shortcuts['Ctrl+I']).toBe('italic')
    expect(pluginBasicFormats.shortcuts['Ctrl+U']).toBe('underline')
  })

  it('adds toolbar buttons on init and removes them on destroy', () => {
    const { element: editor } = createNexusEditor()
    document.body.appendChild(editor)
    editor.use(pluginBasicFormats)

    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-menu-trigger]')).not.toBeNull()

    pluginBasicFormats.destroy(editor)
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-toolbar-item="formatBlock"]')).toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="undo"]')).not.toBeNull()
  })

  it('keeps toolbar buttons of another editor when one instance is destroyed', () => {
    const { element: first } = createNexusEditor()
    const { element: second } = createNexusEditor()
    document.body.append(first, second)
    first.use(pluginBasicFormats)
    second.use(pluginBasicFormats)

    pluginBasicFormats.destroy(first)

    expect(first.toolbar.shadowRoot.querySelector('[data-command="bold"]')).toBeNull()
    expect(second.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
  })
})
