import { describe, it, expect, beforeEach } from 'vitest'
import { createNexusEditor, TAG_NAME } from './nexus-editor.js'
import { pluginBasicFormats } from '../plugins/basic-formats/index.js'

describe('nexus-editor', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  /**
   * @returns {import('./nexus-editor.js').NexusEditorElement}
   */
  function mountEditor() {
    const { element } = createNexusEditor()
    document.body.appendChild(element)
    return element
  }

  it('registers the custom element', () => {
    expect(customElements.get(TAG_NAME)).toBeDefined()
  })

  it('createNexusEditor returns an element and destroy function', () => {
    const { element, destroy } = createNexusEditor()
    expect(element).toBeInstanceOf(HTMLElement)
    expect(element.tagName).toBe('NEXUS-EDITOR')
    expect(typeof destroy).toBe('function')
  })

  it('renders contenteditable area with textbox role', () => {
    const editor = mountEditor()

    const content = editor.contentElement
    expect(content.getAttribute('contenteditable')).toBe('true')
    expect(content.getAttribute('role')).toBe('textbox')
    expect(content.getAttribute('aria-multiline')).toBe('true')
  })

  it('getContent returns html', () => {
    const editor = mountEditor()

    editor.setContent('<p>Hello</p>')
    expect(editor.getContent({ format: 'html' })).toBe('<p>Hello</p>')
  })

  it('throws for unsupported content format', () => {
    const editor = mountEditor()

    expect(() => editor.getContent({ format: 'ast' })).toThrow('not supported')
  })

  it('execCommand applies bold formatting', () => {
    const editor = mountEditor()
    editor.use(pluginBasicFormats)

    editor.contentElement.innerHTML = '<p>Test content</p>'
    const textNode = editor.contentElement.querySelector('p').firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 4)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    editor.execCommand('bold')
    expect(editor.getContent({ format: 'html' })).toBe('<p><strong>Test</strong> content</p>')
  })

  it('exposes toolbar and modal', () => {
    const editor = mountEditor()

    expect(editor.toolbar).toBeDefined()
    expect(editor.modal).toBeDefined()
  })

  it('sanitizes html on setContent and getContent', () => {
    const editor = mountEditor()

    editor.setContent('<div><img src="x" onerror="alert(1)"></div>')
    expect(editor.getContent({ format: 'html' })).not.toContain('onerror')

    editor.contentElement.innerHTML = '<p><a href="javascript:alert(1)">x</a></p>'
    expect(editor.getContent({ format: 'html' })).not.toContain('javascript:')
  })

  it('registers plugins called before connect', () => {
    const { element: editor } = createNexusEditor()
    editor.use(pluginBasicFormats)
    document.body.appendChild(editor)

    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()
  })

  it('does not treat image-only content as empty', () => {
    const editor = mountEditor()
    editor.setContent('<p><img src="/img.png" alt="foto"></p>')
    expect(editor.contentElement.hasAttribute('data-empty')).toBe(false)
  })

  it('sanitizes pasted html', () => {
    const editor = mountEditor()
    const content = editor.contentElement
    content.focus()

    const range = document.createRange()
    range.selectNodeContents(content)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type) => (type === 'text/html' ? '<div><img src="x" onerror="alert(1)"></div>' : ''),
      },
    })
    content.dispatchEvent(event)

    expect(content.innerHTML).not.toContain('onerror')
  })

  it('renders undo and redo controls', () => {
    const editor = mountEditor()

    expect(editor.toolbar.shadowRoot.querySelector('[data-command="undo"]')).not.toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="redo"]')).not.toBeNull()
  })

  it('marks heading toolbar button as pressed', () => {
    const editor = mountEditor()
    editor.use(pluginBasicFormats)

    editor.contentElement.innerHTML = '<p>Título</p>'
    const textNode = editor.contentElement.querySelector('p').firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    editor.execCommand('formatBlock', 'h1')
    const headingButton = editor.toolbar.shadowRoot.querySelector('[data-command="formatBlock"][data-value="h1"]')
    expect(headingButton.getAttribute('aria-checked')).toBe('true')
  })

  it('does not duplicate undo buttons when reconnected', () => {
    const editor = mountEditor()
    document.body.removeChild(editor)
    document.body.appendChild(editor)

    expect(editor.toolbar.shadowRoot.querySelectorAll('[data-command="undo"]')).toHaveLength(1)
  })

  it('falls back to plain text when pasted html sanitizes to empty', () => {
    const editor = mountEditor()
    const content = editor.contentElement
    content.focus()

    const range = document.createRange()
    range.selectNodeContents(content)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type) => (type === 'text/html' ? '<script>alert(1)</script>' : 'hello'),
      },
    })
    content.dispatchEvent(event)

    expect(content.textContent).toContain('hello')
    expect(content.innerHTML).not.toContain('script')
  })
})
