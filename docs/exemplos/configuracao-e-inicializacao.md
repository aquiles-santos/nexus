# Exemplo — configuração e inicialização do Nexus

Página ao vivo: [`/demo/integracao/`](/demo/integracao/) (`npm run dev` → [localhost:5173/demo/integracao/](http://localhost:5173/demo/integracao/)).

O Nexus não usa um JSON externo. A configuração é um **módulo ES** que exporta um objeto `init` (altura, `plugins`, `toolbar`) e é passada na criação do editor (ou em `configure()` depois). Os plugins built-in entram **por nome**, no estilo TinyMCE — sem lista de imports no host.

Um wrapper Vue futuro só encaminha esse `init` (mais `v-model` e `destroy`). O contrato está em [wrapper-vue.md](./wrapper-vue.md); este pacote não depende de Vue.

Este exemplo mostra o trio usual numa página hospedeira:

```
index.html
nexus-config.js      ← opções (plugins + toolbar + altura)
init-editor.js       ← cria o editor, monta no DOM
```

---

## 1. `nexus-config.js`

```javascript
/**
 * @type {import('/src/editor/editor-config.js').NexusEditorConfigInput}
 */
export const editorConfig = {
  height: 400,
  plugins: 'basic-formats lists link media paste-clean source-code',
  toolbar:
    'undo redo | formatBlock | bold italic underline | insertUnorderedList insertOrderedList | insertLink insertImage | toggleSource',
}
```

Equivalente com `toolbar` em array (a ordem é a mesma):

```javascript
export const editorConfig = {
  height: '50vh',
  plugins: ['basic-formats', 'lists', 'link', 'media', 'paste-clean', 'source-code'],
  toolbar: [
    'undo',
    'redo',
    '|',
    'formatBlock',
    '|',
    'bold',
    'italic',
    'underline',
    '|',
    'insertUnorderedList',
    'insertOrderedList',
    '|',
    'insertLink',
    'insertImage',
    '|',
    'toggleSource',
  ],
}
```

### Campos

| Campo | Tipo | Padrão se omitido | Efeito |
|---|---|---|---|
| `height` | `number` ou `string` | `'100%'` | Número vira pixels (`400` → `400px`). String aceita `px`, `%`, `em`, `rem`, `vh`, `vw`, `auto`. Altura fixa zera o mínimo do papel (`--nexus-content-min-height`); o host pode sobrescrever o token. |
| `plugins` | `string`, `string[]`, ou array misto (`nome` + objeto plugin) | nenhum | Nomes do catálogo, separados por espaço na string. Omitido, `''` ou `[]` = nenhum plugin built-in (só undo/redo do core). Nome desconhecido lança erro. |
| `toolbar` | `string[]` ou `string` | `undo redo \| formatBlock \| bold italic underline` | Define **quais** ferramentas aparecem e **em que ordem**. `\|` é separador. |
| `placeholder` | `string`, `false` ou `null` | `'Comece a escrever…'` | Texto exibido quando o conteúdo está vazio. `false` ou `null` desativam o placeholder. String vazia (`''` ou só espaços) também desativa. |

### Regras da toolbar

- A ordem do array (ou da string) é a ordem dos botões.
- Ferramenta listada mas ainda não registrada por um plugin **não aparece** até o plugin carregar.
- `toolbar: []` deixa a barra vazia. String vazia (`''`) volta ao padrão.
- Esconder um botão **não** desliga o comando: `Ctrl+B` continua funcionando sem o botão de negrito.

### IDs de toolbar disponíveis hoje

| ID | Origem | Observação |
|---|---|---|
| `undo`, `redo` | core do editor | Sempre registrados ao conectar |
| `formatBlock` | plugin `basic-formats` | Menu Parágrafo / H1–H3 / Citação |
| `bold`, `italic`, `underline` | plugin `basic-formats` | |
| `insertUnorderedList`, `insertOrderedList` | plugin `lists` | Tab / Shift+Tab dentro de listas |
| `insertLink` | plugin `link` | Atalho `Ctrl+K`; valida href seguro |
| `insertImage` | plugin `media` | Upload local via `StorageAdapter` |
| `toggleSource` | plugin `source-code` | Alterna visual / código |

O `name` de cada plugin (`basic-formats`, `lists`, `link`, `media`, `paste-clean`, `source-code`) é o ID público do catálogo — o mesmo valor usado em `plugins`.

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

Importe a fábrica de alto nível em [`/src/nexus.js`](/src/nexus.js). Ela resolve `plugins` pelo catálogo e chama `use()` internamente.

```javascript
import { createNexusEditor } from '/src/nexus.js'
import { editorConfig } from './nexus-config.js'

function initEditor(root) {
  const mount = root.querySelector('[data-editor-root]')
  if (!mount) {
    return () => {}
  }

  const { element: editor, destroy } = createNexusEditor(editorConfig)
  editor.setAttribute('aria-labelledby', 'post-body-label')
  editor.setContent('<p>Comece a escrever…</p>')
  mount.appendChild(editor)

  return destroy
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor(document)
})
```

`createNexusEditor(config)` aplica a config **antes** do elemento entrar no DOM. A toolbar só mostra o que estiver em `config.toolbar` **e** tiver plugin correspondente em `config.plugins` (ou registrado depois).

Para nomear o campo com o rótulo visível da página, copie o `id` do rótulo para `aria-labelledby` no custom element — o editor repassa o nome ao `textbox`.

---

## Variante — `<nexus-editor>` já no HTML

Se o custom element já está na página (como na demo), use `configureNexusEditor` de [`/src/nexus.js`](/src/nexus.js) para que `plugins` resolva nomes do catálogo:

```html
<nexus-editor id="editor"></nexus-editor>
<script type="module" src="/init-editor.js"></script>
```

```javascript
import { configureNexusEditor } from '/src/nexus.js'
import { editorConfig } from './nexus-config.js'

function initEditor(root) {
  const editor = root.querySelector('#editor')
  if (!editor) {
    return () => {}
  }

  configureNexusEditor(editor, editorConfig)
  editor.setContent('<p>Comece a escrever…</p>')

  return () => editor.destroy()
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor(document)
})
```

O elemento já conectou com os **padrões**. `configure()` mescla altura, toolbar e `plugins` (aditivo) em seguida.

---

## Sem configuração

```javascript
import { createNexusEditor } from '/src/nexus.js'

const { element: editor } = createNexusEditor()
```

Resultado:

- altura `100%`
- nenhum plugin built-in
- toolbar `undo`, `redo`, `|`, `formatBlock`, `|`, `bold`, `italic`, `underline` (os botões de formato só aparecem depois de `plugins: 'basic-formats'`)

---

## Atualizar depois de montado

`configure()` e `editor.config = …` **mesclam** com o valor atual: o campo omitido permanece. `plugins` é **aditivo** (não descarrega o que já foi registrado).

```javascript
editor.configure({ height: 320 })
editor.config = { toolbar: ['bold', 'italic', '|', 'undo'] }

console.log(editor.config)
// { height: '320px', toolbar: ['bold', 'italic', '|', 'undo'], plugins: [...] }
```

Para estender o padrão em vez de substituir:

```javascript
import { DEFAULT_TOOLBAR } from '/src/nexus.js'

editor.configure({
  plugins: 'link',
  toolbar: [...DEFAULT_TOOLBAR, '|', 'insertLink'],
})
```

---

## Plugin customizado

`editor.use(plugin)` permanece para extensões fora do catálogo (equivalente a `PluginManager.add` no TinyMCE). O objeto precisa do contrato de plugin (`name`, `init`, …).

```javascript
import { createNexusEditor } from '/src/nexus.js'
import { pluginCustom } from './plugin-custom.js'

const { element: editor } = createNexusEditor({
  plugins: ['basic-formats', pluginCustom],
  toolbar: 'undo redo | bold | acmeCommand',
})
```

Ou, depois de montado:

```javascript
editor.use(pluginCustom)
```

Não importe os plugins MVP no host: eles já estão no catálogo e entram só por nome em `init.plugins`.

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
