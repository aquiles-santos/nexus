import { describe, it, expect, beforeEach } from 'vitest'
import { createNexusEditor, TAG_NAME, DEFAULT_EDITOR_HEIGHT, DEFAULT_TOOLBAR } from './nexus-editor.js'
import { pluginBasicFormats } from '../plugins/basic-formats/index.js'
import { pluginLists } from '../plugins/lists/index.js'

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

  it('applies default height and toolbar when no config is provided', () => {
    const editor = mountEditor()

    expect(editor.config.height).toBe(DEFAULT_EDITOR_HEIGHT)
    expect(editor.config.toolbar).toEqual(DEFAULT_TOOLBAR)
    expect(editor.style.getPropertyValue('--nexus-editor-height')).toBe(DEFAULT_EDITOR_HEIGHT)
  })

  it('renders the default toolbar tools in the default order', () => {
    const editor = mountEditor()
    editor.use(pluginBasicFormats)

    const order = [...editor.toolbar.shadowRoot.querySelectorAll('[data-toolbar-item]')].map(
      (node) => node.getAttribute('data-toolbar-item'),
    )

    expect(order).toEqual(DEFAULT_TOOLBAR)
  })

  it('applies a custom height from createNexusEditor', () => {
    const { element: editor } = createNexusEditor({ height: 400 })
    document.body.appendChild(editor)

    expect(editor.config.height).toBe('400px')
    expect(editor.style.getPropertyValue('--nexus-editor-height')).toBe('400px')
    expect(editor.style.height).toBe('400px')
    expect(editor.style.flexGrow).toBe('0')
    expect(editor.style.getPropertyValue('--nexus-content-min-height')).toBe('0px')
  })

  it('forwards aria-labelledby from the host to the textbox', () => {
    const caption = document.createElement('span')
    caption.id = 'body-label'
    caption.textContent = 'Conteúdo'
    document.body.appendChild(caption)

    const { element: editor } = createNexusEditor()
    editor.setAttribute('aria-labelledby', 'body-label')
    document.body.appendChild(editor)

    expect(editor.contentElement.getAttribute('aria-labelledby')).toBe('body-label')
    expect(editor.contentElement.hasAttribute('aria-label')).toBe(false)
  })

  it('renders toolbar tools in the configured order and omits the rest', () => {
    const { element: editor } = createNexusEditor({
      toolbar: ['underline', 'bold'],
    })
    document.body.appendChild(editor)
    editor.use(pluginBasicFormats)

    const order = [...editor.toolbar.shadowRoot.querySelectorAll('[data-toolbar-item]')].map(
      (node) => node.getAttribute('data-toolbar-item'),
    )

    expect(order).toEqual(['underline', 'bold'])
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="undo"]')).toBeNull()
    expect(editor.toolbar.shadowRoot.querySelector('[data-command="italic"]')).toBeNull()
  })

  it('renders no toolbar tools when an empty toolbar is configured', () => {
    const { element: editor } = createNexusEditor({ toolbar: [] })
    document.body.appendChild(editor)
    editor.use(pluginBasicFormats)

    expect(editor.toolbar.shadowRoot.querySelector('[data-command]')).toBeNull()
  })

  it('keeps format shortcuts when the tool is omitted from the toolbar', () => {
    const { element: editor } = createNexusEditor({ toolbar: ['italic'] })
    document.body.appendChild(editor)
    editor.use(pluginBasicFormats)

    expect(editor.toolbar.shadowRoot.querySelector('[data-command="bold"]')).toBeNull()

    editor.contentElement.innerHTML = '<p>Test content</p>'
    const textNode = editor.contentElement.querySelector('p').firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 4)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    editor.contentElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }),
    )

    expect(editor.getContent({ format: 'html' })).toBe('<p><strong>Test</strong> content</p>')
  })

  it('updates height and toolbar when configure is called after mount', () => {
    const editor = mountEditor()
    editor.use(pluginBasicFormats)

    editor.configure({
      height: '50vh',
      toolbar: ['italic', '|', 'undo'],
    })

    expect(editor.config.height).toBe('50vh')
    expect(editor.style.getPropertyValue('--nexus-editor-height')).toBe('50vh')
    expect(
      [...editor.toolbar.shadowRoot.querySelectorAll('[data-toolbar-item]')].map((node) =>
        node.getAttribute('data-toolbar-item'),
      ),
    ).toEqual(['italic', '|', 'undo'])
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

  it('returns ast when requested', () => {
    const editor = mountEditor()

    editor.setContent('<p>Hello <strong>world</strong></p>')
    expect(editor.getContent({ format: 'ast' })).toEqual({
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          attrs: {},
          children: [
            { type: 'text', value: 'Hello ' },
            {
              type: 'element',
              tag: 'strong',
              attrs: {},
              children: [{ type: 'text', value: 'world' }],
            },
          ],
        },
      ],
    })
  })

  it('throws for unsupported content format', () => {
    const editor = mountEditor()

    expect(() => editor.getContent({ format: 'markdown' })).toThrow('not supported')
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

  it('hides placeholder after creating a list without text', () => {
    const editor = mountEditor()
    editor.use(pluginBasicFormats)
    editor.use(pluginLists)

    editor.contentElement.focus()
    editor.execCommand('insertUnorderedList')

    expect(editor.contentElement.hasAttribute('data-empty')).toBe(false)
  })

  it('supports disabling the placeholder via config', () => {
    const { element: editor } = createNexusEditor({ placeholder: false })
    document.body.appendChild(editor)

    expect(editor.config.placeholder).toBeNull()
    expect(editor.contentElement.hasAttribute('data-placeholder')).toBe(false)
    expect(editor.contentElement.hasAttribute('aria-placeholder')).toBe(false)
    expect(editor.contentElement.hasAttribute('data-empty')).toBe(false)
  })

  it('applies a custom placeholder via config', () => {
    const { element: editor } = createNexusEditor({ placeholder: 'Digite algo…' })
    document.body.appendChild(editor)

    expect(editor.contentElement.getAttribute('data-placeholder')).toBe('Digite algo…')
    expect(editor.contentElement.getAttribute('aria-placeholder')).toBe('Digite algo…')
  })

  it('removes focus border state on blur', () => {
    const editor = mountEditor()
    const content = editor.contentElement
    const frame = editor.contentFrameElement

    content.focus()
    expect(frame.hasAttribute('data-focused')).toBe(true)

    content.blur()
    expect(frame.hasAttribute('data-focused')).toBe(false)
  })

  it('does not focus the editor when clicking the scroller margin', () => {
    const editor = mountEditor()
    const content = editor.contentElement
    const scroller = editor.scrollerElement
    const frame = editor.contentFrameElement

    content.focus()
    expect(document.activeElement).toBe(content)

    scroller.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      }),
    )

    expect(document.activeElement).not.toBe(content)
    expect(frame.hasAttribute('data-focused')).toBe(false)
  })

  it('does not focus the editor when clicking the content frame margin', () => {
    const editor = mountEditor()
    const content = editor.contentElement
    const frame = editor.contentFrameElement

    content.focus()
    expect(document.activeElement).toBe(content)

    frame.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      }),
    )

    expect(document.activeElement).not.toBe(content)
    expect(frame.hasAttribute('data-focused')).toBe(false)
  })

  it('restores the empty placeholder after undoing image-only content', () => {
    const editor = mountEditor()
    editor.setContent('<p><img src="/img.png" alt="foto"></p>')

    editor.execCommand('undo')

    expect(editor.contentElement.querySelector('img')).toBeNull()
    expect(editor.contentElement.hasAttribute('data-empty')).toBe(true)
  })

  it('exposes selection and host helpers for plugins', () => {
    const editor = mountEditor()

    expect(editor.selection).toBeDefined()
    editor.recordUndo()
    editor.updateToolbarState()
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

  it('wraps content and existing light DOM children in a scroller', () => {
    const editor = document.createElement(TAG_NAME)
    const source = document.createElement('div')
    source.setAttribute('data-nexus-source', '')
    editor.appendChild(source)
    document.body.appendChild(editor)

    const scroller = editor.querySelector('[data-nexus-scroller]')
    expect(scroller).not.toBeNull()
    expect(scroller.contains(editor.contentFrameElement)).toBe(true)
    expect(scroller.contains(editor.contentElement)).toBe(true)
    expect(scroller.contains(source)).toBe(true)
    expect(editor.scrollerElement).toBe(scroller)
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
