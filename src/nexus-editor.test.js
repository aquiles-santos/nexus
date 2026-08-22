import { describe, it, expect, beforeEach } from 'vitest'
import { createNexusEditor, TAG_NAME } from './nexus-editor.js'

describe('nexus-editor', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('registers the custom element', () => {
    expect(customElements.get(TAG_NAME)).toBeDefined()
  })

  it('createNexusEditor returns an HTMLElement with tag NEXUS-EDITOR', () => {
    const editor = createNexusEditor()

    expect(editor).toBeInstanceOf(HTMLElement)
    expect(editor.tagName).toBe('NEXUS-EDITOR')
  })

  it('renders an accessible placeholder when connected to the DOM', () => {
    const editor = createNexusEditor()
    document.body.appendChild(editor)

    expect(editor.getAttribute('role')).toBe('textbox')
    expect(editor.getAttribute('aria-multiline')).toBe('true')
    expect(editor.querySelector('[data-nexus-placeholder]')).not.toBeNull()
  })
})
