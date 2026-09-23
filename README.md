# Nexus

Pure JavaScript WYSIWYG editor with native ES modules and Web Components. The core has no production npm dependencies. Host pages import `createNexusEditor` from `src/nexus.js` and pass an `init` object (height, plugins, toolbar, placeholder). Built-in plugins are selected **by catalog name**, TinyMCE-style — the host does not import plugin modules.

This package is `private` (`0.0.0`). npm/CDN publication (`exports`, package name `@nexus/core`) is not set up yet.

---

## Integration

Live host example: after `npm run dev`, open [http://localhost:5173/demo/integration/](http://localhost:5173/demo/integration/). Full field reference: [docs/examples/configuration-and-initialization.md](docs/examples/configuration-and-initialization.md). Vue wrapper contract: [docs/examples/wrapper-vue.md](docs/examples/wrapper-vue.md).

### Prerequisites

| Requirement | What this repo uses |
| --- | --- |
| **Runtime (browser)** | Native ES modules and Custom Elements. Target browsers in the project plan are the current stable Chrome, Firefox, Safari, and Edge. Automated E2E covers Chromium only (`playwright.config.js`). |
| **Runtime (dev tooling)** | Node.js to run `npm` scripts. Root `package.json` has **no** `engines` field. Current tools (Vitest 3, Playwright, `serve`) typically need **Node.js 18+**. `[TODO: confirmar]` a pinned version if you need a supported-matrix statement. |
| **Packages (core)** | No runtime dependencies. Dev-only: `serve`, `vitest`, `jsdom`, `eslint`, `@playwright/test` (see root `package.json`). |
| **Packages (Vue host)** | Optional. `@nexus/vue` (`packages/vue`) lists `vue` as a **peer** (`^3.0.0`) and a **dev** dependency (`^3.5.13`). Vue is **not** listed on the root package. |
| **External accounts / credentials** | None. There is no `.env`, API key, or cloud service for the editor. Image insert uses a local `StorageAdapter` (`blob:` URLs). Remote storage (S3, Cloudinary, and similar) is out of scope until after v1. |
| **Served files** | The host must be able to load `/src/nexus.js` (and its module graph) and `/assets/styles/tokens.css` over HTTP. Opening HTML as `file://` will not resolve those absolute paths. |

### Configuration

Nexus does **not** read a JSON/YAML config file or environment variables for editor behavior. Configuration is an ES module exporting an `init` object (`NexusEditorConfigInput` in `src/editor/editor-config.js`), passed to `createNexusEditor` or `configureNexusEditor`.

#### Editor `init` fields

| Name | Description | Example |
| --- | --- | --- |
| `height` | Editor chrome height. Finite numbers greater than 0 become pixels (`400` → `400px`). Strings: `px`, `%`, `em`, `rem`, `vh`, `vw`, `vmin`, `vmax`, `auto`. Invalid or omitted → `'100%'`. A fixed height clears the paper min-height token; the host can override CSS. | `400` or `'50vh'` |
| `plugins` | Built-in plugins by catalog **name** (space-separated string, string array, or mixed array of names + plugin objects). Omitted, `''`, or `[]` → no built-in plugins (core still has undo/redo). Unknown names throw. | `'basic-formats lists link media paste-clean source-code'` |
| `toolbar` | Tool IDs and order. `\|` is a separator. `[]` is an empty bar. `''` or omitted → default `undo redo \| formatBlock \| bold italic underline`. Tools listed before their plugin is registered stay hidden until the plugin loads. Hiding a button does not disable the command (for example `Ctrl+B` still works without Bold). | `'undo redo \| bold italic'` |
| `placeholder` | Shown when the document is empty. Default `'Comece a escrever…'`. `false`, `null`, or whitespace-only string disables it. | `'Write here…'` |

Catalog names and toolbar IDs that exist today:

| Catalog `plugins` name | Toolbar IDs it registers |
| --- | --- |
| *(core, always)* | `undo`, `redo` |
| `basic-formats` | `formatBlock`, `bold`, `italic`, `underline` |
| `lists` | `insertUnorderedList`, `insertOrderedList` |
| `link` | `insertLink` |
| `media` | `insertImage` |
| `paste-clean` | *(no toolbar button; cleans pasted HTML)* |
| `source-code` | `toggleSource` |

Do not import those MVP plugins in the host; they live in `src/plugins/catalog.js`. Custom plugins go in a mixed `plugins` array or `editor.use(plugin)` and must implement `{ name, init, commands, destroy }` (see the custom-plugin section in [docs/examples/configuration-and-initialization.md](docs/examples/configuration-and-initialization.md)).

#### Environment variables

The editor does not use application env vars. The only `process.env` usage in this repo is Playwright:

| Name | Description | Example |
| --- | --- | --- |
| `CI` | When set, Playwright forbids `test.only`, retries twice, uses one worker, and always starts a fresh `npm run dev` instead of reusing a local server. Not required for hosting the editor. | `CI=1` |

#### Config files in the repo (host pattern)

Typical trio, as in `demo/integration/`:

```
index.html          ← mount point + stylesheet + module script
nexus-config.js     ← exports `editorConfig` (`init`)
init-editor.js      ← `createNexusEditor(editorConfig)`, `setContent`, `appendChild`
```

#### Styles and permissions

- Load design tokens: `/assets/styles/tokens.css`. The custom element injects its own `nexus-editor.css` into the shadow root and `nexus-editor-content.css` on `document.head`.
- Images: PNG, JPEG, GIF, WebP; default max **5 MB** (`DEFAULT_MAX_IMAGE_BYTES` in `src/data/storage-adapter.js`). Upload is local (`URL.createObjectURL`); `blob:` URLs do not survive a reload.
- Content Security Policy used by the demos (adjust `connect-src` if the host posts HTML to an API):

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
/>
```

`style-src 'unsafe-inline'` is required today because UI (tooltips, resize overlay) sets coordinates via `element.style`. `img-src` must allow `blob:` for local media.

### Installation (step by step)

Commands assume the repository root. Copy in order.

```bash
# 1. Install core dev tooling (static server, unit tests, lint, Playwright)
npm install

# 2. (Optional) Vue wrapper tests — peer Vue is not installed at the repo root
cd packages/vue
npm install
cd ../..

# 3. Serve the repo over HTTP (port 5173, CORS enabled)
npm run dev
```

Then open:

- Playground: [http://localhost:5173/demo/](http://localhost:5173/demo/)
- Host-style integration: [http://localhost:5173/demo/integration/](http://localhost:5173/demo/integration/)

Checks (optional):

```bash
npm test
npm run test:vue
npm run lint
npx playwright install chromium
npm run e2e
```

There is no `npm publish` / install-from-registry path yet. In a host app on localhost, import the factory with a URL that resolves to this repo’s `src/nexus.js` (the demo uses `/src/nexus.js` because `serve` uses the repo root as the web root).

### Example usage

Minimal host that mounts a configured editor and reads sanitized HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/assets/styles/tokens.css" />
  </head>
  <body>
    <label id="post-body-label" for="unused">Body</label>
    <div data-editor-root></div>
    <script type="module">
      import { createNexusEditor } from '/src/nexus.js'

      const { element: editor } = createNexusEditor({
        height: 400,
        plugins: 'basic-formats lists link media paste-clean source-code',
        toolbar:
          'undo redo | formatBlock | bold italic underline | insertUnorderedList insertOrderedList | insertLink insertImage | toggleSource',
      })

      editor.setAttribute('aria-labelledby', 'post-body-label')
      editor.setContent('<p>Start writing…</p>')
      document.querySelector('[data-editor-root]').appendChild(editor)

      const html = editor.getContent({ format: 'html' })
      console.log(html)
    </script>
  </body>
</html>
```

`getContent({ format: 'html' })` returns schema-sanitized HTML. `getContent({ format: 'ast' })` returns the JSON AST. Other formats throw (`Format "…" is not supported yet`). Do not read `innerHTML` on the contenteditable node for persistence.

The `contenteditable` surface is **not** included in `FormData`. On submit, copy HTML into a hidden field or JSON body:

```javascript
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const html = editor.getContent({ format: 'html' })
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'fetch',
    },
    body: JSON.stringify({ body: html }),
  })
  if (!response.ok) {
    return
  }
})
```

`/api/posts` is a **host** endpoint, not provided by Nexus. `[TODO: confirmar]` the path and auth headers your backend expects.

If `<nexus-editor>` is already in the HTML, resolve catalog names with `configureNexusEditor` (plain `configure()` stores plugin **names** but does not load the catalog):

```javascript
import { configureNexusEditor } from '/src/nexus.js'
import { editorConfig } from './nexus-config.js'

const editor = document.querySelector('#editor')
configureNexusEditor(editor, editorConfig)
editor.setContent('<p>Hello</p>')
```

#### Vue 3 (`packages/vue`)

Install Vue in that package (`npm install` inside `packages/vue`). On localhost the wrapper imports `../../../src/nexus.js`, not a published `@nexus/core` package.

```vue
<script setup>
import { ref } from 'vue'
import NexusEditor from '@nexus/vue'

const content = ref('<p>Draft</p>')
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

Shortcut props (`plugins`, `toolbar`, `height`, `placeholder`) merge onto `init` and win when both are set. The wrapper does not accept `disabled`, `readonly`, `inline`, `api-key`, or `cloud-channel`. Load `tokens.css` the same way as the vanilla demo.

### Troubleshooting

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| `Unknown plugin "…"` | Name is not in `PLUGIN_CATALOG` (`basic-formats`, `lists`, `link`, `media`, `paste-clean`, `source-code`). | Fix the spelling in `init.plugins`. Custom plugins must be objects in the array, not unknown strings. |
| `plugins must be a string, an array of names, or a mixed array…` | `plugins` is a number or other unsupported type. | Pass a string, `string[]`, or mixed name/object array. |
| Format buttons missing | `plugins` omitted or empty, or toolbar IDs without the matching plugin. Default toolbar lists `formatBlock` / `bold` but they stay hidden until `basic-formats` is loaded. | Set `plugins` to include the catalog names that register those tools. |
| `Format "markdown" is not supported yet` (or any format other than `html` / `ast`) | Markdown export is post-v1. | Use `{ format: 'html' }` or `{ format: 'ast' }`. |
| `Only PNG, JPEG, GIF, and WebP images are supported.` | File MIME type is outside `ALLOWED_IMAGE_TYPES`. | Convert the file or keep the default types. |
| `Image must be smaller than 5 MB.` | File exceeds `DEFAULT_MAX_IMAGE_BYTES`. | Compress the image. Changing the limit requires a custom `StorageAdapter` passed to `createPluginMedia` — not via `init` today. |
| Images disappear after refresh | Local adapter returns `blob:` URLs. | Persist files on your backend; do not rely on `blob:` for stored documents. |
| Empty POST / missing body | `contenteditable` is not a form control. | Call `getContent({ format: 'html' })` on submit. |
| CORS / failed module load | Page not served from the same origin as `/src/…`, or opened as `file://`. | Use `npm run dev` (or another static server with the repo as root). The `dev` script already passes `--cors`. |
| Scripts do nothing | Script is not `type="module"`. | Nexus is ESM-only. |
| Unstyled chrome / wrong colors | Host omitted tokens. | Link `/assets/styles/tokens.css`. |
| Vue cursor jumps / undo fills with no-ops | Parent `v-model` writes back the same HTML without comparing serialized output. | Compare `getContent({ format: 'html' })` before `setContent` (the shipped wrapper already does this). |
| Vue import `@nexus/core` fails | That package name is the **planned** published name; localhost uses `src/nexus.js`. | Import `@nexus/vue` from `packages/vue` as documented, or import `src/nexus.js` directly. `[TODO: confirmar]` import maps / aliases in your bundler. |
| E2E cannot reach the app | Nothing listening on port **5173**. | Run `npm run dev`, or let `npm run e2e` start `webServer` itself. |

---

## Scripts

| Script | Command |
| --- | --- |
| `npm run dev` | Static server on port 5173 with CORS |
| `npm test` | Vitest (`src/**/*.test.js`, jsdom) |
| `npm run test:vue` | Vitest for `packages/vue` |
| `npm run test:watch` | Vitest watch |
| `npm run e2e` | Playwright against `http://localhost:5173` |
| `npm run lint` | ESLint |

## Further reading

- [docs/examples/configuration-and-initialization.md](docs/examples/configuration-and-initialization.md) — config fields, toolbar rules, custom plugins, form submit
- [docs/examples/wrapper-vue.md](docs/examples/wrapper-vue.md) — Vue prop map and lifecycle
