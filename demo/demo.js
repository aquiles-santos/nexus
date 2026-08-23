import '/src/editor/nexus-editor.js';
import { isSafeHref } from '/src/core/schema.js';
import { pluginBasicFormats } from '/src/plugins/basic-formats/index.js';
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

  /** @type {Range | null} */
  let linkRange = null;
  let saveTimer = null;
  /** @type {(() => void)[]} */
  const chromeTeardowns = [];

  const chromePlugin = {
    name: 'host-chrome',
    init(instance) {
      chromeTeardowns.push(
        instance.toolbar.addButton({
          command: 'formatBlock',
          label: '',
          separator: true,
        }),
        instance.toolbar.addButton({
          command: 'insertUnorderedList',
          label: 'Lista com marcadores (em breve)',
          icon: createToolbarIcon('listUl'),
          disabled: true,
        }),
        instance.toolbar.addButton({
          command: 'insertOrderedList',
          label: 'Lista numerada (em breve)',
          icon: createToolbarIcon('listOl'),
          disabled: true,
        }),
        instance.toolbar.addButton({
          command: 'formatBlock',
          label: '',
          separator: true,
        }),
        instance.toolbar.addButton({
          command: 'insertLink',
          label: 'Link',
          icon: createToolbarIcon('link'),
        }),
        instance.toolbar.addButton({
          command: 'insertImage',
          label: 'Imagem (em breve)',
          icon: createToolbarIcon('image'),
          disabled: true,
        }),
        instance.toolbar.addButton({
          command: 'formatBlock',
          label: '',
          separator: true,
        }),
        instance.toolbar.addButton({
          command: 'toggleSource',
          label: 'Código',
          icon: createToolbarIcon('code'),
        }),
      );
    },
    commands: {
      insertLink() {
        openLinkModal();
      },
      applyLink(_instance, payload) {
        applyLinkToSelection(payload);
      },
      toggleSource() {
        setView(
          editor.getAttribute('data-mode') === 'source' ? 'visual' : 'source',
        );
      },
    },
    shortcuts: {
      'Ctrl+K': 'insertLink',
    },
    destroy() {
      for (const teardown of chromeTeardowns) {
        teardown();
      }
      chromeTeardowns.length = 0;
    },
  };

  editor.use(pluginBasicFormats);
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

  function openLinkModal() {
    const selection = window.getSelection();
    linkRange =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;

    const form = document.createElement('form');
    form.noValidate = true;

    const textField = createField('Display Text', 'link-text', {
      placeholder: 'Link text',
    });
    const urlField = createUrlField();
    form.append(textField.field, urlField.field);

    if (linkRange && !linkRange.collapsed) {
      textField.input.value = linkRange.toString();
    }

    function handleInsert() {
      const href = urlField.input.value.trim();
      if (!isSafeHref(href)) {
        urlField.error.hidden = false;
        urlField.error.textContent =
          'Enter a valid http, https, mailto, or tel URL.';
        urlField.input.setAttribute('aria-invalid', 'true');
        urlField.input.focus();
        return;
      }

      urlField.error.hidden = true;
      urlField.input.removeAttribute('aria-invalid');
      editor.execCommand('applyLink', {
        href,
        text: textField.input.value.trim(),
      });
      editor.modal.close();
      queueMicrotask(() => {
        editor.contentElement.focus({ preventScroll: true });
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleInsert();
    });

    editor.modal.open({
      title: 'Insert link',
      content: form,
      actions: [
        {
          label: 'Insert',
          primary: true,
          action: handleInsert,
        },
        { label: 'Cancel', action: () => {} },
      ],
    });

    queueMicrotask(() => textField.input.focus());
  }

  function applyLinkToSelection({ href, text } = {}) {
    if (
      !isSafeHref(href) ||
      !editor.contentElement.contains(
        linkRange?.commonAncestorContainer ?? null,
      )
    ) {
      return;
    }

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(linkRange);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', href);

    if (linkRange.collapsed) {
      anchor.textContent = text || href;
      linkRange.insertNode(anchor);
    } else if (text && text !== linkRange.toString()) {
      linkRange.deleteContents();
      anchor.textContent = text;
      linkRange.insertNode(anchor);
    } else {
      try {
        linkRange.surroundContents(anchor);
      } catch {
        const contents = linkRange.extractContents();
        anchor.appendChild(contents);
        linkRange.insertNode(anchor);
      }
    }

    linkRange = null;
  }

  function createField(
    labelText,
    id,
    { type = 'text', placeholder = '', required = false } = {},
  ) {
    const field = document.createElement('div');
    field.className = 'modal__field';

    const label = document.createElement('label');
    label.className = 'modal__label';
    label.setAttribute('for', id);
    label.textContent = labelText;

    const input = document.createElement('input');
    input.className = 'modal__input';
    input.id = id;
    input.type = type;
    input.setAttribute('placeholder', placeholder);
    input.autocomplete = 'off';
    input.required = required;

    field.append(label, input);
    return { field, input };
  }

  function createUrlField() {
    const { field, input } = createField('URL', 'link-url', {
      type: 'url',
      placeholder: 'https://',
      required: true,
    });

    const error = document.createElement('p');
    error.id = 'link-url-error';
    error.className = 'modal__error';
    error.setAttribute('data-url-error', '');
    error.setAttribute('role', 'alert');
    error.hidden = true;
    input.setAttribute('aria-describedby', error.id);
    field.append(error);

    return { field, input, error };
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
