# Exemplo — configuração e inicialização do Nexus

Página ao vivo: [`/demo/integracao/`](/demo/integracao/) (`npm run dev` → [localhost:5173/demo/integracao/](http://localhost:5173/demo/integracao/)).

O Nexus não usa um JSON externo. A configuração é um **módulo ES** que exporta um objeto e é passada na criação do editor (ou em `configure()` depois).

Este exemplo mostra o trio usual numa página hospedeira:

```
index.html
nexus-config.js      ← opções (altura + toolbar)
init-editor.js       ← cria o editor, registra plugins, monta no DOM
```

---

## 1. `nexus-config.js`

```javascript
import { DEFAULT_TOOLBAR } from '/src/editor/nexus-editor.js'

/**
 * @type {import('/src/editor/editor-config.js').NexusEditorConfigInput}
 */
export const editorConfig = {
  height: 400,
  toolbar: [
    ...DEFAULT_TOOLBAR,
    '|',
    'insertLink',
    '|',
    'toggleSource',
  ],
}
```

Equivalente em string (a ordem é a mesma):

```javascript
export const editorConfig = {
  height: '50vh',
  toolbar: 'undo redo | formatBlock | bold italic underline | insertLink | toggleSource',
}
```

### Campos

| Campo | Tipo | Padrão se omitido | Efeito |
|---|---|---|---|
| `height` | `number` ou `string` | `'100%'` | Número vira pixels (`400` → `400px`). String aceita `px`, `%`, `em`, `rem`, `vh`, `vw`, `auto`. Altura fixa zera o mínimo do papel (`--nexus-content-min-height`); o host pode sobrescrever o token. |
| `toolbar` | `string[]` ou `string` | `undo redo \| formatBlock \| bold italic underline` | Define **quais** ferramentas aparecem e **em que ordem**. `\|` é separador. |

### Regras da toolbar

- A ordem do array (ou da string) é a ordem dos botões.
- Ferramenta listada mas ainda não registrada por um plugin **não aparece** até o plugin carregar.
- `toolbar: []` deixa a barra vazia. String vazia (`''`) volta ao padrão.
- Esconder um botão **não** desliga o comando: `Ctrl+B` continua funcionando sem o botão de negrito.

### IDs disponíveis hoje

| ID | Origem | Observação |
|---|---|---|
| `undo`, `redo` | core do editor | Sempre registrados ao conectar |
| `formatBlock` | plugin `basic-formats` | Menu Parágrafo / H1–H3 / Citação |
| `bold`, `italic`, `underline` | plugin `basic-formats` | |
| `insertUnorderedList`, `insertOrderedList` | plugin da página hospedeira | Na demo ainda estão desabilitados |
| `insertLink`, `insertImage` | plugin da página hospedeira | `insertImage` ainda desabilitado na demo |
| `toggleSource` | plugin da página hospedeira | Alterna visual / código |

---

## 2. `index.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexus</title>
    <link rel="stylesheet" href="/assets/styles/tokens.css" />
  </head>
  <body>
    <main>
      <h1>Documento</h1>
      <label class="host-label" id="post-body-label">Conteúdo</label>
      <div data-editor-root></div>
    </main>
    <script type="module" src="/init-editor.js"></script>
  </body>
</html>
```

---

## 3. `init-editor.js`

```javascript
import { createNexusEditor } from '/src/editor/nexus-editor.js'
import { pluginBasicFormats } from '/src/plugins/basic-formats/index.js'
import { editorConfig } from './nexus-config.js'

function initEditor(root) {
  const mount = root.querySelector('[data-editor-root]')
  if (!mount) {
    return () => {}
  }

  const { element: editor, destroy } = createNexusEditor(editorConfig)
  editor.setAttribute('aria-labelledby', 'post-body-label')

  editor.use(pluginBasicFormats)
  editor.setContent('<p>Comece a escrever…</p>')
  mount.appendChild(editor)

  return destroy
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor(document)
})
```

`createNexusEditor(config)` aplica a config **antes** do elemento entrar no DOM. Plugins entram com `use()`; a toolbar só mostra o que estiver em `config.toolbar` **e** tiver sido registrado.

Para nomear o campo com o rótulo visível da página, copie o `id` do rótulo para `aria-labelledby` no custom element — o editor repassa o nome ao `textbox`.

---

## Variante — `<nexus-editor>` já no HTML

Se o custom element já está na página (como na demo):

```html
<nexus-editor id="editor"></nexus-editor>
<script type="module" src="/init-editor.js"></script>
```

```javascript
import '/src/editor/nexus-editor.js'
import { pluginBasicFormats } from '/src/plugins/basic-formats/index.js'
import { editorConfig } from './nexus-config.js'

function initEditor(root) {
  const editor = root.querySelector('#editor')
  if (!editor) {
    return () => {}
  }

  editor.configure(editorConfig)
  editor.use(pluginBasicFormats)
  editor.setContent('<p>Comece a escrever…</p>')

  return () => editor.destroy()
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor(document)
})
```

O elemento já conectou com os **padrões**. `configure()` substitui altura e/ou toolbar em seguida.

---

## Sem configuração

```javascript
const { element: editor } = createNexusEditor()
editor.use(pluginBasicFormats)
```

Resultado:

- altura `100%`
- toolbar `undo`, `redo`, `|`, `formatBlock`, `|`, `bold`, `italic`, `underline`

---

## Atualizar depois de montado

`configure()` e `editor.config = …` **mesclam** com o valor atual: o campo omitido permanece.

```javascript
editor.configure({ height: 320 })
editor.config = { toolbar: ['bold', 'italic', '|', 'undo'] }

console.log(editor.config)
// { height: '320px', toolbar: ['bold', 'italic', '|', 'undo'] }
```

Para estender o padrão em vez de substituir:

```javascript
import { DEFAULT_TOOLBAR } from '/src/editor/nexus-editor.js'

editor.configure({
  toolbar: [...DEFAULT_TOOLBAR, '|', 'insertLink'],
})
```

---

## Ler o conteúdo no submit (enviar para uma API)

O `contenteditable` **não** entra em `FormData` sozinho. No `submit`, leia o HTML com `getContent()` e envie no body.

```javascript
form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const html = editor.getContent({ format: 'html' })
  const payload = {
    title: form.querySelector('#post-title').value,
    body: html,
  }

  const controller = new AbortController()
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'fetch',
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })

  if (!response.ok) {
    // trate o erro na UI (aria-live / aria-describedby)
    return
  }
})
```

`getContent({ format: 'html' })` devolve HTML sanitizado (schema do editor). Não leia `innerHTML` direto.

Formulário clássico (POST nativo): copie o HTML para um hidden **no submit**, não a cada tecla.

```html
<form method="post" action="/posts">
  <input id="post-title" name="title" type="text" />
  <div data-editor-root></div>
  <input type="hidden" name="body" data-editor-body />
  <button type="submit">Publicar</button>
</form>
```

```javascript
form.addEventListener('submit', () => {
  form.querySelector('[data-editor-body]').value = editor.getContent({ format: 'html' })
})
```

Guarde a referência devolvida por `createNexusEditor()` — ou selecione o custom element:

```javascript
const editor = document.querySelector('nexus-editor')
editor.getContent({ format: 'html' })
```
