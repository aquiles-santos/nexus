# `@nexus/vue`

Wrapper Vue 3 do Nexus. O componente só encaminha props para `createNexusEditor` — o catálogo de plugins permanece no core.

O `package.json` da raiz do Nexus **não** lista Vue. Instale as deps deste pacote à parte (`peer` + `dev` de `vue@^3`).

```bash
cd packages/vue
npm install
npm test
```

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

No localhost, o componente importa o core em `src/nexus.js`. Publicação npm/CDN (`exports` do core, tokens, nome `@nexus/core`) fica para depois.

Contrato completo: [`docs/examples/wrapper-vue.md`](../../docs/examples/wrapper-vue.md).
