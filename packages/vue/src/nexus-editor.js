import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createNexusEditor } from '../../../src/nexus.js'
import { resolveInit, shouldApplyModelValue } from './resolve-init.js'

export const NexusEditor = defineComponent({
  name: 'NexusEditor',
  props: {
    modelValue: { type: String, default: undefined },
    initialValue: { type: String, default: undefined },
    init: { type: Object, default: () => ({}) },
    plugins: { type: [String, Array], default: undefined },
    toolbar: { type: [String, Array], default: undefined },
    height: { type: [Number, String], default: undefined },
    placeholder: { type: [String, Boolean], default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const host = ref(null)
    let editor = null
    let destroyEditor = () => {}

    function handleContentInput() {
      emit('update:modelValue', editor.getContent({ format: 'html' }))
    }

    onMounted(() => {
      const created = createNexusEditor(resolveInit(props))
      editor = created.element
      destroyEditor = created.destroy
      host.value.appendChild(editor)

      const initial =
        typeof props.modelValue === 'string' ? props.modelValue : props.initialValue
      if (typeof initial === 'string') {
        editor.setContent(initial)
      }

      editor.contentElement.addEventListener('input', handleContentInput)
    })

    watch(
      () => props.modelValue,
      (next) => {
        if (!shouldApplyModelValue(editor, next)) {
          return
        }
        editor.setContent(next)
      },
    )

    onBeforeUnmount(() => {
      editor?.contentElement.removeEventListener('input', handleContentInput)
      destroyEditor()
      editor = null
    })

    return () => h('div', { ref: host })
  },
})

export default NexusEditor
