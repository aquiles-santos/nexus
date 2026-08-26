import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_TYPES,
  createLocalStorageAdapter,
} from '../../data/storage-adapter.js';
import { ensureEditableStructure, insertImageWithStructure } from '../../core/content-structure.js';
import { createToolbarIcon } from '../../ui/icons/icons.js';

/** @type {Map<object, { teardowns: (() => void)[], selectedImage: HTMLImageElement | null, overlay: HTMLElement | null, fileInput: HTMLInputElement | null, adapter: ReturnType<typeof createLocalStorageAdapter>, uploadedUrls: Set<string> }>} */
const stateByEditor = new Map();

function getState(editor, adapter) {
  if (!stateByEditor.has(editor)) {
    stateByEditor.set(editor, {
      teardowns: [],
      selectedImage: null,
      overlay: null,
      fileInput: null,
      adapter: adapter ?? createLocalStorageAdapter(),
      uploadedUrls: new Set(),
    });
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
  for (const url of state.uploadedUrls) {
    state.adapter.remove?.(url);
  }
  state.uploadedUrls.clear();
  state.fileInput?.remove();
  state.overlay?.remove();
  stateByEditor.delete(editor);
}

/**
 * @param {ReturnType<typeof createLocalStorageAdapter>} adapter
 * @returns {import('../../shared/plugin-registry.js').NexusPlugin}
 */
export function createPluginMedia(adapter) {
  return {
    name: 'media',

    init(editor) {
      clearState(editor);
      const state = getState(editor, adapter);
      const content = editor.contentElement;
      const scroller = editor.scrollerElement;

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = ALLOWED_IMAGE_ACCEPT;
      fileInput.hidden = true;
      fileInput.setAttribute('data-media-input', '');
      document.body.appendChild(fileInput);
      state.fileInput = fileInput;

      const overlay = document.createElement('div');
      overlay.className = 'nexus-image-resize';
      overlay.hidden = true;
      overlay.setAttribute('data-nexus-image-resize', '');
      scroller.appendChild(overlay);
      state.overlay = overlay;

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'nexus-image-resize__handle';
      handle.setAttribute('aria-label', 'Redimensionar imagem');
      handle.setAttribute('data-resize-handle', '');
      handle.setAttribute('role', 'slider');
      handle.setAttribute('aria-orientation', 'horizontal');
      handle.setAttribute('aria-valuemin', '40');
      overlay.appendChild(handle);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'nexus-image-resize__delete';
      deleteButton.setAttribute('aria-label', 'Remover imagem');
      deleteButton.setAttribute('data-delete-image', '');
      deleteButton.appendChild(createToolbarIcon('trash'));
      overlay.appendChild(deleteButton);

      function deselectImage() {
        state.selectedImage = null;
        overlay.hidden = true;
        content.querySelectorAll('img[data-selected]').forEach((img) => {
          img.removeAttribute('data-selected');
        });
      }

      function positionOverlay(image) {
        const scrollerRect = scroller.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        overlay.style.top = `${imageRect.top - scrollerRect.top + scroller.scrollTop}px`;
        overlay.style.left = `${imageRect.left - scrollerRect.left + scroller.scrollLeft}px`;
        overlay.style.width = `${imageRect.width}px`;
        overlay.style.height = `${imageRect.height}px`;
        overlay.hidden = false;
        handle.setAttribute('aria-valuenow', String(Math.round(imageRect.width)));
        handle.setAttribute('aria-valuemax', String(getContentInnerWidth()));
      }

      function selectImage(image) {
        deselectImage();
        state.selectedImage = image;
        image.setAttribute('data-selected', '');
        positionOverlay(image);
      }

      function deleteSelectedImage() {
        const image = state.selectedImage;
        if (!image) {
          return;
        }

        const imageUrl = image.getAttribute('src');
        editor.recordUndo();
        image.remove();
        if (imageUrl) {
          state.uploadedUrls.delete(imageUrl);
          state.adapter.remove?.(imageUrl);
        }
        deselectImage();
        ensureEditableStructure(content, editor.selection);
        content.focus({ preventScroll: true });
        editor.recordUndo();
        content.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }

      const handleDeleteClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteSelectedImage();
      };

      const handleScrollerReposition = () => {
        if (state.selectedImage) {
          positionOverlay(state.selectedImage);
        }
      };

      const handleContentClick = (event) => {
        const target = /** @type {HTMLElement} */ (event.target);
        const image = target.closest('img');
        if (image instanceof HTMLImageElement && content.contains(image)) {
          event.preventDefault();
          selectImage(image);
          return;
        }

        if (!target.closest('[data-nexus-image-resize]')) {
          deselectImage();
        }
      };

      let dragStartX = 0;
      let dragStartWidth = 0;
      let dragRatio = 1;

      const handlePointerDown = (event) => {
        if (!state.selectedImage) {
          return;
        }

        dragStartX = event.clientX;
        dragStartWidth = state.selectedImage.width || state.selectedImage.getBoundingClientRect().width;
        dragRatio =
          (state.selectedImage.naturalHeight || dragStartWidth)
          / (state.selectedImage.naturalWidth || dragStartWidth);
        handle.setPointerCapture(event.pointerId);
        editor.recordUndo();
      };

      function getContentInnerWidth() {
        const frame = editor.contentFrameElement;
        const styles = getComputedStyle(frame);
        const horizontalPadding =
          Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
        return Math.max(40, Math.floor(frame.clientWidth - horizontalPadding));
      }

      const handlePointerMove = (event) => {
        if (!state.selectedImage || !handle.hasPointerCapture(event.pointerId)) {
          return;
        }

        const maxWidth = getContentInnerWidth();
        const nextWidth = Math.min(
          maxWidth,
          Math.max(40, Math.round(dragStartWidth + (event.clientX - dragStartX))),
        );
        state.selectedImage.setAttribute('width', String(nextWidth));
        state.selectedImage.setAttribute(
          'height',
          String(Math.round(nextWidth * dragRatio)),
        );
        positionOverlay(state.selectedImage);
      };

      const handlePointerUp = (event) => {
        if (handle.hasPointerCapture(event.pointerId)) {
          handle.releasePointerCapture(event.pointerId);
          editor.recordUndo();
        }
      };

      function getImageFileFromDataTransfer(dataTransfer) {
        if (!dataTransfer) {
          return null;
        }

        const files = [...dataTransfer.files].filter((file) =>
          ALLOWED_IMAGE_TYPES.has(file.type),
        );
        return files[0] ?? null;
      }

      function getRangeFromPoint(clientX, clientY) {
        if (typeof document.caretRangeFromPoint === 'function') {
          const range = document.caretRangeFromPoint(clientX, clientY);
          if (range && content.contains(range.startContainer)) {
            return range;
          }
        }

        if (typeof document.caretPositionFromPoint === 'function') {
          const position = document.caretPositionFromPoint(clientX, clientY);
          if (position?.offsetNode && content.contains(position.offsetNode)) {
            const range = document.createRange();
            range.setStart(position.offsetNode, position.offset);
            range.collapse(true);
            return range;
          }
        }

        return editor.selection?.getRange() ?? null;
      }

      async function insertImageFromFile(file, range) {
        const url = await state.adapter.upload(file);
        const alt = file.name.replace(/\.[^.]+$/, '') || 'Image';
        const selection = editor.selection;
        const insertRange = range ?? selection?.getRange();
        if (!insertRange) {
          await state.adapter.remove?.(url);
          return;
        }

        state.uploadedUrls.add(url);
        editor.recordUndo();
        const image = document.createElement('img');
        image.src = url;
        image.alt = alt;
        insertImageWithStructure(image, insertRange, content, selection);
        editor.recordUndo();
        content.dispatchEvent(new InputEvent('input', { bubbles: true }));
        image.addEventListener(
          'load',
          () => {
            if (state.selectedImage === image) {
              positionOverlay(image);
            }
          },
          { once: true },
        );
        selectImage(image);
      }

      const handleFileChange = async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) {
          return;
        }

        try {
          await insertImageFromFile(file);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to insert image.';
          editor.modal.open({
            title: 'Insert image',
            content: message,
            actions: [{ label: 'Close', action: () => {} }],
          });
        }
      };

      const handlePaste = async (event) => {
        const file = getImageFileFromDataTransfer(event.clipboardData);
        if (!file) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        try {
          await insertImageFromFile(file);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to insert image.';
          editor.modal.open({
            title: 'Insert image',
            content: message,
            actions: [{ label: 'Close', action: () => {} }],
          });
        }
      };

      const handleDrop = async (event) => {
        const file = getImageFileFromDataTransfer(event.dataTransfer);
        if (!file) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        try {
          const range = getRangeFromPoint(event.clientX, event.clientY);
          await insertImageFromFile(file, range);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to insert image.';
          editor.modal.open({
            title: 'Insert image',
            content: message,
            actions: [{ label: 'Close', action: () => {} }],
          });
        }
      };

      const handleDragOver = (event) => {
        const file = getImageFileFromDataTransfer(event.dataTransfer);
        if (!file) {
          return;
        }

        event.preventDefault();
      };

      content.addEventListener('click', handleContentClick);
      content.addEventListener('paste', handlePaste, true);
      content.addEventListener('dragover', handleDragOver, true);
      content.addEventListener('drop', handleDrop, true);
      handle.addEventListener('pointerdown', handlePointerDown);
      handle.addEventListener('pointermove', handlePointerMove);
      handle.addEventListener('pointerup', handlePointerUp);
      deleteButton.addEventListener('click', handleDeleteClick);
      scroller.addEventListener('scroll', handleScrollerReposition, { passive: true });
      fileInput.addEventListener('change', handleFileChange);

      state.teardowns.push(
        () => content.removeEventListener('click', handleContentClick),
        () => content.removeEventListener('paste', handlePaste, true),
        () => content.removeEventListener('dragover', handleDragOver, true),
        () => content.removeEventListener('drop', handleDrop, true),
        () => handle.removeEventListener('pointerdown', handlePointerDown),
        () => handle.removeEventListener('pointermove', handlePointerMove),
        () => handle.removeEventListener('pointerup', handlePointerUp),
        () => deleteButton.removeEventListener('click', handleDeleteClick),
        () => scroller.removeEventListener('scroll', handleScrollerReposition),
        () => fileInput.removeEventListener('change', handleFileChange),
        editor.toolbar.registerItem('insertImage', {
          command: 'insertImage',
          label: 'Imagem',
          icon: () => createToolbarIcon('image'),
        }),
      );
    },

    commands: {
      insertImage(editor) {
        const state = getState(editor, adapter);
        state.fileInput?.click();
      },
    },

    shortcuts: {},

    destroy(editor) {
      if (editor) {
        clearState(editor);
        return;
      }

      for (const instance of [...stateByEditor.keys()]) {
        clearState(instance);
      }
    },
  };
}

/** @type {import('../../shared/plugin-registry.js').NexusPlugin} */
export const pluginMedia = createPluginMedia();
