import '/src/editor/nexus-editor.js';
import { DEFAULT_TOOLBAR } from '/src/editor/editor-config.js';
import { pluginBasicFormats } from '/src/plugins/basic-formats/index.js';
import { pluginLists } from '/src/plugins/lists/index.js';
import { pluginLink } from '/src/plugins/link/index.js';
import { pluginMedia } from '/src/plugins/media/index.js';
import { createToolbarIcon } from '/src/ui/icons/icons.js';

const SAMPLE_HTML = `
<h1>The Architecture of Modern Content Systems</h1>
<p>Great software begins with clarity. The best editors treat structure as a first-class citizen, so <strong>great writing tools get out of the way.</strong></p>
<h2>Structured Editing</h2>
<p>Headings, lists, and quotes are not decoration. They encode meaning that survives paste, export, and later redesign. A predictable schema keeps every document interoperable.</p>
<blockquote>Design is not just what it looks like and feels like. Design is how it works. — Steve Jobs</blockquote>
<ul>
  <li>Block-level structure that round-trips to HTML</li>
  <li>Inline marks that can be toggled without fighting the caret</li>
  <li>A toolbar that reports the format under the selection</li>
</ul>
<h2>Media and Embeds</h2>
<p>Images belong in the document flow, not in a side channel. Captions, size, and alt text travel with the file so the published page matches what the author saw.</p>
<p><em>Hero image — click to select, drag corner handles to resize</em></p>
`.trim();

/**
 * @param {ParentNode} root
 * @returns {() => void}
 */
export function initDemo(root) {
  const editor = root.querySelector('#editor');
  const wordCount = root.querySelector('[data-word-count]');
  const charCount = root.querySelector('[data-char-count]');
  const saveStatus = root.querySelector('[data-save-status]');
  const viewButtons = [...root.querySelectorAll('[data-view]')];
  const sourceInput = root.querySelector('[data-source-input]');

  if (
    !(editor instanceof HTMLElement) ||
    !wordCount ||
    !charCount ||
    !saveStatus ||
    !sourceInput
  ) {
    return () => {};
  }

  let saveTimer = null;
  /** @type {(() => void)[]} */
  const chromeTeardowns = [];

  const chromePlugin = {
    name: 'host-chrome',
    init(instance) {
      chromeTeardowns.push(
        instance.toolbar.registerItem('toggleSource', {
          command: 'toggleSource',
          label: 'Código',
          icon: () => createToolbarIcon('code'),
        }),
      );
    },
    commands: {
      toggleSource() {
        setView(
          editor.getAttribute('data-mode') === 'source' ? 'visual' : 'source',
        );
      },
    },
    shortcuts: {},
    destroy() {
      for (const teardown of chromeTeardowns) {
        teardown();
      }
      chromeTeardowns.length = 0;
    },
  };

  editor.configure({
    toolbar: [
      ...DEFAULT_TOOLBAR,
      '|',
      'insertUnorderedList',
      'insertOrderedList',
      '|',
      'insertLink',
      'insertImage',
      '|',
      'toggleSource',
    ],
  });
  editor.use(pluginBasicFormats);
  editor.use(pluginLists);
  editor.use(pluginLink);
  editor.use(pluginMedia);
  editor.use(chromePlugin);
  editor.setContent(SAMPLE_HTML);
  updateCounts();
  setView('visual');

  editor.addEventListener('input', handleEditorInput);
  for (const button of viewButtons) {
    button.addEventListener('click', handleViewClick);
  }

  function handleEditorInput() {
    updateCounts();
    markSaving();
  }

  function handleViewClick(event) {
    const button = event.currentTarget;
    const view = button.getAttribute('data-view');
    if (view === 'visual' || view === 'source') {
      setView(view);
    }
  }

  function updateCounts() {
    const text = editor.contentElement.textContent ?? '';
    const trimmed = text.replace(/\s+/g, ' ').trim();
    const words = trimmed ? trimmed.split(' ').length : 0;
    wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
    charCount.textContent = `${text.length} ${text.length === 1 ? 'character' : 'characters'}`;
  }

  function markSaving() {
    saveStatus.textContent = 'Saving…';
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      saveStatus.textContent = 'Saved';
      saveTimer = null;
    }, 400);
  }

  function setView(mode) {
    if (mode === 'source') {
      sourceInput.value = formatHtml(editor.getContent({ format: 'html' }));
      editor.setAttribute('data-mode', 'source');
    } else {
      if (editor.getAttribute('data-mode') === 'source') {
        editor.setContent(sourceInput.value);
        updateCounts();
      }
      editor.removeAttribute('data-mode');
    }

    const isSource = mode === 'source';
    for (const button of viewButtons) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-view') === mode),
      );
    }

    editor.toolbar.setPressed('toggleSource', isSource);
    editor.toolbar.setLabel('toggleSource', isSource ? 'Visual' : 'Código');
    editor.toolbar.setIcon(
      'toggleSource',
      createToolbarIcon(isSource ? 'eye' : 'code'),
    );
  }

  return () => {
    editor.removeEventListener('input', handleEditorInput);
    for (const button of viewButtons) {
      button.removeEventListener('click', handleViewClick);
    }
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    chromePlugin.destroy();
  };
}

function formatHtml(html) {
  return html.replace(/></g, '>\n<').replace(/\n+/g, '\n').trim();
}

document.addEventListener('DOMContentLoaded', () => {
  initDemo(document);
});
