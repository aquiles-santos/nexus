# Exemplo — contrato do wrapper Vue

Este documento **congela** o que o wrapper Vue (`@nexus/vue`) pode chamar no core. O Vue só encaminha props para `createNexusEditor` — o mesmo `init` da [configuração vanilla](./configuration-and-initialization.md).

Implementação: [`packages/vue`](../../packages/vue/). O `package.json` da raiz permanece vanilla (sem Vue). Não reimplemente o catálogo no wrapper.

Alvo do consumidor:

```vue
<NexusEditor v-model="content" :init="editorConfig" />
```

---

## Mapa prop → Nexus

| Prop / opção Vue | Destino no core |
|---|---|
| `init` | argumento de `createNexusEditor` em [`/src/nexus.js`](/src/nexus.js) |
| `plugins` / `toolbar` / `height` / `placeholder` | atalhos que fazem **merge** em `init` (o atalho vence se os dois existirem) |
| `v-model` (`modelValue`) | `setContent` na montagem; `input` em `contentElement` → `getContent({ format: 'html' })` |
| `initial-value` | `setContent` **uma vez** na montagem, só se não houver `v-model` inicial |
| unmount | `destroy()` da fábrica (teardown + `remove()`) |

Fora deste contrato (não existem no editor e o wrapper **não** deve inventá-los): `disabled`, `readonly`, `inline`, `api-key`, `cloud-channel`.

O wrapper **não** reimplementa o catálogo. Nomes em `plugins` passam direto para a fábrica de alto nível.

---

## Merge de `init` com atalhos

```javascript
function resolveInit(props) {
  const init = { ...(props.init ?? {}) }

  if (props.plugins !== undefined) {
    init.plugins = props.plugins
  }
  if (props.toolbar !== undefined) {
    init.toolbar = props.toolbar
  }
  if (props.height !== undefined) {
    init.height = props.height
  }
  if (props.placeholder !== undefined) {
    init.placeholder = props.placeholder
  }

  return init
}
```

`plugins` omitido no objeto final continua significando nenhum plugin built-in.

---

## Ciclo de vida

1. **`onMounted`** — `createNexusEditor(resolveInit(props))`, `appendChild` no host `ref`.
2. **Conteúdo inicial** — se `modelValue` for string, `setContent(modelValue)`. Senão, se `initialValue` for string, `setContent(initialValue)` uma vez.
3. **`v-model` de saída** — listener de `input` em `editor.contentElement` (não no host Vue). No handler: `emit('update:modelValue', editor.getContent({ format: 'html' }))`.
4. **`v-model` de entrada (watch)** — ver guarda contra eco abaixo. Sem ela, cada tecla chama `setContent`, que grava undo e reposiciona o cursor.
5. **`onBeforeUnmount`** — `destroy()`. Não reimplementar `disconnectedCallback`.

O `input` dispara no `contenteditable` interno. Escutar só o custom element é frágil: o wrapper deve usar `contentElement`.

Estilos: o host Vue carrega os tokens como na demo vanilla (`tokens.css`). Empacotamento npm/CDN (exports, injeção de tokens) é pré-requisito para publicar `@nexus/vue`, não deste contrato.

---

## Guarda contra eco do `v-model`

`setContent` sanitiza o HTML, grava o undo manager e atualiza a toolbar. Se o watch reaplicar o valor que o próprio editor acabou de emitir, o cursor volta ao fim do bloco e o histórico de undo enche de no-ops.

Compare o HTML **já serializado** antes de escrever:

```javascript
watch(
  () => props.modelValue,
  (next) => {
    if (!editor) {
      return
    }

    const incoming = next ?? ''
    const current = editor.getContent({ format: 'html' })
    if (incoming === current) {
      return
    }

    editor.setContent(incoming)
  },
)
```

Não compare por referência de objeto. `getContent({ format: 'html' })` devolve string sanitizada; o pai deve guardar essa string (ou aceitar que `setContent` normalize o valor).

---

## Componente de referência (`NexusEditor.vue`)

O pacote em [`packages/vue/src/nexus-editor.js`](../../packages/vue/src/nexus-editor.js) é a implementação (ESM + `defineComponent`, sem compilador de SFC). O SFC abaixo é o mesmo contrato, na forma que um host Vue costuma copiar.

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createNexusEditor } from '@nexus/core'

const props = defineProps({
  modelValue: { type: String, default: undefined },
  initialValue: { type: String, default: undefined },
  init: { type: Object, default: () => ({}) },
  plugins: { type: [String, Array], default: undefined },
  toolbar: { type: [String, Array], default: undefined },
  height: { type: [Number, String], default: undefined },
  placeholder: { type: [String, Boolean], default: undefined },
})

const emit = defineEmits(['update:modelValue'])

const host = ref(null)
let editor = null
let destroyEditor = () => {}

function resolveInit() {
  const init = { ...(props.init ?? {}) }
  if (props.plugins !== undefined) init.plugins = props.plugins
  if (props.toolbar !== undefined) init.toolbar = props.toolbar
  if (props.height !== undefined) init.height = props.height
  if (props.placeholder !== undefined) init.placeholder = props.placeholder
  return init
}

function handleContentInput() {
  emit('update:modelValue', editor.getContent({ format: 'html' }))
}

onMounted(() => {
  const created = createNexusEditor(resolveInit())
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
    if (!editor || typeof next !== 'string') {
      return
    }
    if (next === editor.getContent({ format: 'html' })) {
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
</script>

<template>
  <div ref="host"></div>
</template>
```

O import `@nexus/core` é o nome previsto do core publicado. No localhost, `@nexus/vue` importa [`/src/nexus.js`](/src/nexus.js).

---

## Uso no host Vue

```vue
<script setup>
import { ref } from 'vue'
import NexusEditor from '@nexus/vue'

const content = ref('<p>Rascunho</p>')

const editorConfig = {
  height: 400,
  plugins: 'basic-formats lists link media paste-clean source-code',
  toolbar:
    'undo redo | formatBlock | bold italic underline | insertUnorderedList insertOrderedList | insertLink insertImage | toggleSource',
}
</script>

<template>
  <NexusEditor v-model="content" :init="editorConfig" />
</template>
```

Atalhos equivalentes (sem repetir campos em `init`):

```vue
<NexusEditor
  v-model="content"
  plugins="basic-formats lists"
  toolbar="undo redo | bold italic"
  :height="400"
/>
```

Só valor inicial, sem binding contínuo:

```vue
<NexusEditor :init="editorConfig" initial-value="<p>Uma vez</p>" />
```

---

## O que o wrapper não faz

- Não chama `use()` para plugins do catálogo — isso é da fábrica.
- Não troca `StorageAdapter` via `init`.
- Não altera o ciclo `disconnectedCallback` / keep-alive além de `destroy()` no unmount.
- Plugin customizado continua sendo objeto no array misto `plugins: ['lists', pluginCustom]`, ou `editor.use()` se o wrapper expuser a instância (fora do MVP do componente).
