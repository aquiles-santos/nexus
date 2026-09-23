import { findAncestorAnchor } from '../../core/content-queries.js';
import { isSafeHref } from '../../core/schema.js';
import { createToolbarIcon } from '../../ui/icons/icons.js';

/** @type {Map<object, { linkRange: Range | null, teardowns: (() => void)[] }>} */
const stateByEditor = new Map();

function getState(editor) {
  if (!stateByEditor.has(editor)) {
    stateByEditor.set(editor, { linkRange: null, teardowns: [] });
  }
  return stateByEditor.get(editor);
}

function clearState(editor) {
  const state = stateByEditor.get(editor);
  if (!state) {
    return;
  }

  for (const teardown of state.teardowns) {
    teardown();
  }
  stateByEditor.delete(editor);
}

/**
 * @param {string} labelText
 * @param {string} id
 * @param {{ type?: string, placeholder?: string, required?: boolean }} [options]
 */
function createField(labelText, id, { type = 'text', placeholder = '', required = false } = {}) {
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
  error.setAttribute('role', 'alert');
  error.hidden = true;
  input.setAttribute('aria-describedby', error.id);
  field.append(error);

  return { field, input, error };
}

export const pluginLink = {
  name: 'link',

  init(editor) {
    clearState(editor);
    const state = getState(editor);

    state.teardowns.push(
      editor.toolbar.registerItem('insertLink', {
        command: 'insertLink',
        label: 'Link',
        icon: () => createToolbarIcon('link'),
        overflowPriority: 30,
      }),
    );
  },

  commands: {
    insertLink(editor) {
      const state = getState(editor);
      const selection = window.getSelection();
      const content = editor.contentElement;
      const existingAnchor = selection?.rangeCount
        ? findAncestorAnchor(content, selection.getRangeAt(0).startContainer)
        : null;

      state.linkRange =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0).cloneRange()
          : null;

      const form = document.createElement('form');
      form.noValidate = true;

      const textField = createField('Texto exibido', 'link-text', {
        placeholder: 'Texto do link',
      });
      const urlField = createUrlField();
      form.append(textField.field, urlField.field);

      if (existingAnchor) {
        textField.input.value = existingAnchor.textContent ?? '';
        urlField.input.value = existingAnchor.getAttribute('href') ?? '';
        state.linkRange = document.createRange();
        state.linkRange.selectNodeContents(existingAnchor);
      } else if (state.linkRange && !state.linkRange.collapsed) {
        textField.input.value = state.linkRange.toString();
      }

      function handleInsert() {
        const href = urlField.input.value.trim();
        if (!isSafeHref(href)) {
          urlField.error.hidden = false;
          urlField.error.textContent =
            'Informe uma URL http, https, mailto ou tel válida.';
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
        title: 'Inserir link',
        content: form,
        actions: [
          {
            label: 'Inserir',
            primary: true,
            action: handleInsert,
          },
          { label: 'Cancelar', action: () => {} },
        ],
      });

      queueMicrotask(() => textField.input.focus());
    },

    applyLink(editor, payload) {
      const state = getState(editor);
      const { href, text } = payload ?? {};
      let linkRange = state.linkRange;

      if (!linkRange) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          linkRange = selection.getRangeAt(0).cloneRange();
        }
      }

      if (
        !isSafeHref(href)
        || !linkRange
        || !editor.contentElement.contains(linkRange.commonAncestorContainer)
      ) {
        return;
      }

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(linkRange);

      const existingAnchor = findAncestorAnchor(
        editor.contentElement,
        linkRange.commonAncestorContainer,
      );

      const anchor = existingAnchor ?? document.createElement('a');
      anchor.setAttribute('href', href);
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');

      if (existingAnchor) {
        anchor.textContent = text || href;
        state.linkRange = null;
        return;
      }

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

      state.linkRange = null;
    },
  },

  shortcuts: {
    'Ctrl+K': 'insertLink',
  },

  destroy(editor) {
    clearState(editor);
  },
};