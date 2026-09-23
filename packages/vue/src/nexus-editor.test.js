import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { NexusEditor } from './nexus-editor.js'

describe('NexusEditor Vue wrapper', () => {
  /** @type {HTMLDivElement} */
  let root
  /** @type {ReturnType<typeof createApp> | null} */
  let app

  beforeEach(() => {
    document.body.replaceChildren()
    root = document.createElement('div')
    document.body.appendChild(root)
    app = null
  })

  afterEach(() => {
    app?.unmount()
    app = null
  })

  /**
   * @param {import('vue').Component} component
   */
  function mount(component) {
    app = createApp(component)
    app.mount(root)
  }

  function editorElement() {
    return root.querySelector('nexus-editor')
  }

  it('creates the editor from init plus shortcut props', async () => {
    mount({
      render: () =>
        h(NexusEditor, {
          init: { height: 200, plugins: 'basic-formats', toolbar: 'bold' },
          height: 400,
          plugins: 'lists',
          toolbar: 'insertUnorderedList',
        }),
    })
    await nextTick()

    const editor = editorElement()
    expect(editor).not.toBeNull()
    expect(editor.config.height).toBe('400px')
    expect(editor.config.plugins).toEqual(['lists'])
    expect(editor.config.toolbar).toEqual(['insertUnorderedList'])
  })

  it('applies v-model on mount and emits html from contentElement input', async () => {
    const content = ref('<p>Rascunho</p>')

    mount(
      defineComponent({
        setup() {
          return () =>
            h(NexusEditor, {
              modelValue: content.value,
              'onUpdate:modelValue': (value) => {
                content.value = value
              },
            })
        },
      }),
    )
    await nextTick()

    const editor = editorElement()
    expect(editor.getContent({ format: 'html' })).toBe('<p>Rascunho</p>')

    editor.contentElement.innerHTML = '<p>Editado</p>'
    editor.contentElement.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextTick()

    expect(content.value).toBe('<p>Editado</p>')
  })

  it('does not call setContent when v-model echoes the current html', async () => {
    const content = ref('<p>Rascunho</p>')

    mount(
      defineComponent({
        setup() {
          return () =>
            h(NexusEditor, {
              modelValue: content.value,
              'onUpdate:modelValue': (value) => {
                content.value = value
              },
            })
        },
      }),
    )
    await nextTick()

    const editor = editorElement()
    const originalSetContent = editor.setContent.bind(editor)
    let setContentCalls = 0
    editor.setContent = (html) => {
      setContentCalls += 1
      originalSetContent(html)
    }

    editor.contentElement.innerHTML = '<p>Editado</p>'
    editor.contentElement.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextTick()

    expect(content.value).toBe('<p>Editado</p>')
    expect(setContentCalls).toBe(0)
  })

  it('uses initial-value only when v-model is not a string', async () => {
    mount({
      render: () =>
        h(NexusEditor, {
          initialValue: '<p>Uma vez</p>',
        }),
    })
    await nextTick()

    expect(editorElement().getContent({ format: 'html' })).toBe('<p>Uma vez</p>')
  })

  it('prefers v-model over initial-value on mount', async () => {
    mount({
      render: () =>
        h(NexusEditor, {
          modelValue: '<p>Binding</p>',
          initialValue: '<p>Uma vez</p>',
        }),
    })
    await nextTick()

    expect(editorElement().getContent({ format: 'html' })).toBe('<p>Binding</p>')
  })

  it('calls destroy on unmount', async () => {
    mount({
      render: () => h(NexusEditor, { modelValue: '<p>X</p>' }),
    })
    await nextTick()

    const editor = editorElement()
    expect(document.body.contains(editor)).toBe(true)

    app.unmount()
    app = null
    await nextTick()

    expect(document.body.contains(editor)).toBe(false)
  })
})
