import { serializeAst } from '../data/ast-serializer.js';
import { serializeHtml } from '../data/html-serializer.js';
import { parseHtml } from '../data/html-parser.js';
import { sanitizeHtml } from '../data/sanitizer.js';
import { getActiveListType, findAncestorAnchor } from '../core/content-queries.js';
import { createSelectionManager } from '../core/selection.js';
import { createCommands } from '../core/commands.js';
import { createUndoManager } from '../core/undo-manager.js';
import { createEventBus } from '../shared/event-bus.js';
import { createPluginRegistry, getShortcutKey } from '../shared/plugin-registry.js';
import { createToolbarIcon } from '../ui/icons/icons.js';
import { resolveEditorConfig } from './editor-config.js';
import '../ui/toolbar/nexus-toolbar.js';
import '../ui/tooltip/nexus-tooltip.js';
import '../ui/modal/nexus-modal.js';

const TAG_NAME = 'nexus-editor';
const INITIAL_CONTENT = '<p><br></p>';
const CONTENT_STYLES_ATTR = 'data-nexus-content-styles';

function ensureContentStyles() {
  if (document.head.querySelector(`link[${CONTENT_STYLES_ATTR}]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./nexus-editor-content.css', import.meta.url).href;
  link.setAttribute(CONTENT_STYLES_ATTR, '');
  document.head.appendChild(link);
}

class NexusEditorElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./nexus-editor.css', import.meta.url).href;
    this.shadowRoot.appendChild(link);

    this._chrome = document.createElement('div');
    this._chrome.className = 'chrome';
    this._chrome.part = 'chrome';
    this.shadowRoot.appendChild(this._chrome);

    this._toolbar = document.createElement('nexus-toolbar');
    this._chrome.appendChild(this._toolbar);

    this._canvas = document.createElement('div');
    this._canvas.className = 'canvas';
    this._canvas.part = 'canvas';
    this._chrome.appendChild(this._canvas);

    this._slot = document.createElement('slot');
    this._slot.className = 'content-slot';
    this._slot.part = 'content-slot';
    this._canvas.appendChild(this._slot);

    this._tooltip = document.createElement('nexus-tooltip');
    this._chrome.appendChild(this._tooltip);

    this._modal = document.createElement('nexus-modal');
    this._chrome.appendChild(this._modal);

    this._scroller = document.createElement('div');
    this._scroller.setAttribute('data-nexus-scroller', '');
    this._scroller.part = 'scroller';

    this._content = document.createElement('div');
    this._content.setAttribute('data-nexus-content', '');
    this._content.setAttribute('contenteditable', 'true');
    this._content.setAttribute('role', 'textbox');
    this._content.setAttribute('aria-multiline', 'true');
    this._content.part = 'content';
    this._syncAccessibleName();

    /** @type {ReturnType<typeof createSelectionManager> | null} */
    this._selection = null;
    /** @type {ReturnType<typeof createCommands> | null} */
    this._commands = null;
    /** @type {ReturnType<typeof createUndoManager> | null} */
    this._undo = null;
    /** @type {ReturnType<typeof createEventBus> | null} */
    this._bus = null;
    /** @type {ReturnType<typeof createPluginRegistry> | null} */
    this._registry = null;
    /** @type {import('./core/selection.js').NexusBookmark | null} */
    this._toolbarBookmark = null;
    this._isExecutingCommand = false;
    this._initialized = false;
    /** @type {import('./shared/plugin-registry.js').NexusPlugin[]} */
    this._plugins = [];
    /** @type {(() => void)[]} */
    this._historyTeardowns = [];
    /** @type {import('./editor-config.js').NexusEditorConfig} */
    this._config = resolveEditorConfig();
  }

  static get observedAttributes() {
    return ['aria-label', 'aria-labelledby'];
  }

  attributeChangedCallback() {
    this._syncAccessibleName();
  }

  connectedCallback() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;

    this._applyHeight();
    this._ensureScrollerLayout();
    if (!this._content.hasChildNodes()) {
      this._content.innerHTML = INITIAL_CONTENT;
    }
    this._checkEmpty();

    this._selection = createSelectionManager(this._content);
    this._commands = createCommands(this._content, this._selection);
    this._undo = createUndoManager(this._content, () => this._selection.saveBookmark());
    this._bus = createEventBus();
    this._registry = createPluginRegistry(this, this._bus);

    this._undo.reset();
    this._registerHistoryItems();

    this._toolbar.setCommandHandler((command, value) => {
      this.execCommand(command, value, this._toolbarBookmark);
      this._toolbarBookmark = null;
    });

    this._toolbar.addEventListener('nexus:toolbar-pointerdown', this._handleToolbarPointerDown);
    this._toolbar.addEventListener('nexus:toolbar-tooltip-show', this._handleToolbarTooltipShow);
    this._toolbar.addEventListener('nexus:toolbar-tooltip-hide', this._handleToolbarTooltipHide);

    this._content.addEventListener('input', this._handleInput);
    this._content.addEventListener('beforeinput', this._handleBeforeInput);
    this._content.addEventListener('keydown', this._handleKeyDown);
    this._content.addEventListener('mouseup', this._handleCaretMove);
    this._content.addEventListener('keyup', this._handleCaretMove);
    this._content.addEventListener('paste', this._handlePaste);
    this._content.addEventListener('drop', this._handleDrop);
    this._content.addEventListener('nexus:restore-bookmark', this._handleRestoreBookmark);
    document.addEventListener('selectionchange', this._handleSelectionChange);

    for (const plugin of this._plugins) {
      this._registry.use(plugin);
    }

    this._syncToolbar();
  }

  disconnectedCallback() {
    this._teardown();
  }

  _ensureScrollerLayout() {
    if (!this.contains(this._scroller)) {
      while (this.firstChild) {
        this._scroller.appendChild(this.firstChild);
      }
      this.appendChild(this._scroller);
    }

    if (!this._scroller.contains(this._content)) {
      this._scroller.appendChild(this._content);
    }
  }

  _teardown() {
    if (!this._initialized) {
      return;
    }

    this._content.removeEventListener('input', this._handleInput);
    this._content.removeEventListener('beforeinput', this._handleBeforeInput);
    this._content.removeEventListener('keydown', this._handleKeyDown);
    this._content.removeEventListener('mouseup', this._handleCaretMove);
    this._content.removeEventListener('keyup', this._handleCaretMove);
    this._content.removeEventListener('paste', this._handlePaste);
    this._content.removeEventListener('drop', this._handleDrop);
    this._content.removeEventListener('nexus:restore-bookmark', this._handleRestoreBookmark);
    document.removeEventListener('selectionchange', this._handleSelectionChange);
    this._toolbar.removeEventListener('nexus:toolbar-pointerdown', this._handleToolbarPointerDown);
    this._toolbar.removeEventListener('nexus:toolbar-tooltip-show', this._handleToolbarTooltipShow);
    this._toolbar.removeEventListener('nexus:toolbar-tooltip-hide', this._handleToolbarTooltipHide);
    this._registry?.destroy();
    this._bus?.destroy();
    this._undo?.destroy();
    for (const teardown of this._historyTeardowns) {
      teardown();
    }
    this._historyTeardowns = [];
    this._registry = null;
    this._bus = null;
    this._initialized = false;
  }

  _registerHistoryItems() {
    this._historyTeardowns = [
      this._toolbar.registerItem('undo', {
        command: 'undo',
        label: 'Desfazer',
        icon: () => createToolbarIcon('undo'),
      }),
      this._toolbar.registerItem('redo', {
        command: 'redo',
        label: 'Refazer',
        icon: () => createToolbarIcon('redo'),
      }),
    ];
  }

  _applyHeight() {
    const { height } = this._config;
    const isFluid = height === '100%' || height === 'auto';

    this.style.setProperty('--nexus-editor-height', height);
    this.style.height = height;

    if (isFluid) {
      this.style.removeProperty('--nexus-content-min-height');
      this.style.removeProperty('flex-grow');
      this.style.removeProperty('flex-shrink');
      this.style.removeProperty('flex-basis');
      return;
    }

    this.style.setProperty('--nexus-content-min-height', '0px');
    this.style.flexGrow = '0';
    this.style.flexShrink = '0';
    this.style.flexBasis = 'auto';
  }

  _syncAccessibleName() {
    if (!this._content) {
      return;
    }

    const labelledBy = this.getAttribute('aria-labelledby');
    const label = this.getAttribute('aria-label');

    if (labelledBy) {
      this._content.setAttribute('aria-labelledby', labelledBy);
      this._content.removeAttribute('aria-label');
      return;
    }

    this._content.removeAttribute('aria-labelledby');
    this._content.setAttribute('aria-label', label || 'Editor de texto');
  }

  _syncToolbar() {
    this._toolbar.applyLayout(this._config.toolbar);
    this._updateHistoryButtons();
  }

  /**
   * @param {import('./editor-config.js').NexusEditorConfigInput} [input]
   */
  configure(input = {}) {
    this._config = resolveEditorConfig({
      height: input.height !== undefined ? input.height : this._config.height,
      toolbar: input.toolbar !== undefined ? input.toolbar : this._config.toolbar,
    });
    this._applyHeight();
    if (this._initialized) {
      this._syncToolbar();
    }
  }

  _updateHistoryButtons() {
    this._toolbar.setDisabled('undo', !this._undo?.canUndo());
    this._toolbar.setDisabled('redo', !this._undo?.canRedo());
  }

  _handleToolbarPointerDown = () => {
    this._toolbarBookmark = this._selection?.saveBookmark();
  };

  _handleToolbarTooltipShow = (event) => {
    this._tooltip.show(event.detail.button, event.detail.label);
  };

  _handleToolbarTooltipHide = () => {
    this._tooltip.hide();
  };

  _handleInput = () => {
    this._checkEmpty();
    this._undo?.recordInput();
    this._updateToolbarState();
  };

  _handleBeforeInput = (event) => {
    if (event.inputType !== 'insertText' && event.inputType !== 'insertCompositionText') {
      return;
    }

    const pendingMarks = this._commands?.formatter.getPendingMarks();
    if (!pendingMarks?.size) {
      return;
    }

    event.preventDefault();
    this._undo?.record();

    const text = event.data ?? '';
    const range = this._selection?.getRange();
    if (!range) {
      return;
    }

    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    this._commands.formatter.applyPendingMarks(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);
    this._selection.setRange(range);

    this._content.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  };

  _handleKeyDown = (event) => {
    const key = getShortcutKey(event);
    const shortcutCommand = this._registry?.getShortcuts().get(key);

    if (shortcutCommand) {
      event.preventDefault();
      this.execCommand(shortcutCommand);
      return;
    }

    if (key === 'Ctrl+Z' || key === 'Ctrl+Shift+Z') {
      event.preventDefault();
      if (event.shiftKey) {
        this._undo?.redo();
      } else {
        this._undo?.undo();
      }
      this._checkEmpty();
      this._updateToolbarState();
      this._updateHistoryButtons();
      return;
    }

    if (key === 'Ctrl+Y') {
      event.preventDefault();
      this._undo?.redo();
      this._checkEmpty();
      this._updateToolbarState();
      this._updateHistoryButtons();
    }
  };

  _handlePaste = (event) => {
    const html = event.clipboardData?.getData('text/html');
    const text = event.clipboardData?.getData('text/plain');
    if (!html && !text) {
      return;
    }

    event.preventDefault();
    this._insertSanitizedContent(html, text);
  };

  _handleDrop = (event) => {
    const html = event.dataTransfer?.getData('text/html');
    const text = event.dataTransfer?.getData('text/plain');
    if (!html && !text) {
      return;
    }

    event.preventDefault();
    this._insertSanitizedContent(html, text);
  };

  _insertSanitizedContent(html, plainText) {
    this._undo?.record();
    const range = this._selection?.getRange();
    if (!range) {
      return;
    }

    range.deleteContents();

    const fragment = html ? parseHtml(html, this._bus) : null;
    if (fragment?.hasChildNodes()) {
      const lastNode = fragment.lastChild;
      range.insertNode(fragment);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        this._selection.setRange(range);
      }
    } else if (plainText) {
      const textNode = document.createTextNode(plainText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      this._selection.setRange(range);
    }

    this._checkEmpty();
    this._undo?.record();
    this._updateToolbarState();
  }

  _handleRestoreBookmark = (event) => {
    this._selection?.restoreBookmark(event.detail);
  };

  _handleCaretMove = () => {
    this._commands?.formatter.clearPendingMarks();
    this._updateToolbarState();
  };

  _handleSelectionChange = () => {
    if (this._isExecutingCommand) {
      return;
    }

    if (!this._content.contains(document.activeElement) && !this._content.contains(this._selection?.getRange()?.commonAncestorContainer ?? null)) {
      return;
    }
    this._updateToolbarState();
  };

  _updateToolbarState() {
    const formatter = this._commands?.formatter;
    if (!formatter) {
      return;
    }

    const activeBlock = formatter.getActiveBlockTag();
    const range = this._selection?.getRange();
    const activeListType = range
      ? getActiveListType(this._content, this._selection)
      : null;
    const isInsideLink = range
      ? Boolean(findAncestorAnchor(this._content, range.startContainer))
      : false;

    this._toolbar.updatePressed((command, value) => {
      if (command === 'formatBlock') {
        return Boolean(value) && value === activeBlock;
      }
      if (command === 'insertUnorderedList') {
        return activeListType === 'ul';
      }
      if (command === 'insertOrderedList') {
        return activeListType === 'ol';
      }
      if (command === 'insertLink') {
        return isInsideLink;
      }
      if (command === 'toggleSource') {
        return this.getAttribute('data-mode') === 'source';
      }
      return formatter.isActive(command);
    });
    this._updateHistoryButtons();
  }

  _checkEmpty() {
    const hasText = this._content.textContent.trim() !== '';
    const hasMedia = Boolean(this._content.querySelector('img'));
    this._content.toggleAttribute('data-empty', !hasText && !hasMedia);
  }

  /**
   * @param {{ format?: 'html' | 'ast' }} [options]
   * @returns {string | import('../data/ast-serializer.js').AstRoot}
   */
  getContent(options = {}) {
    const { format = 'html' } = options;

    if (this.getAttribute('data-mode') === 'source') {
      const sourceInput = this.querySelector('[data-source-input]');
      if (sourceInput instanceof HTMLTextAreaElement) {
        const html = sanitizeHtml(sourceInput.value);
        if (format === 'ast') {
          const template = document.createElement('template');
          template.innerHTML = html;
          return serializeAst(template.content);
        }
        return html;
      }
    }

    if (format === 'ast') {
      return serializeAst(this._content);
    }

    if (format !== 'html') {
      throw new Error(`Format "${format}" is not supported yet`);
    }

    return serializeHtml(this._content);
  }

  setContent(html) {
    this._undo?.record();
    this._content.innerHTML = sanitizeHtml(html) || INITIAL_CONTENT;
    this._checkEmpty();
    this._undo?.record();
    this._updateToolbarState();
  }

  /**
   * @param {string} name
   * @param {unknown} [value]
   * @param {import('./core/selection.js').NexusBookmark | null} [bookmark]
   * @returns {boolean}
   */
  execCommand(name, value, bookmark = null) {
    this._isExecutingCommand = true;

    try {
      if (bookmark) {
        this._selection?.restoreBookmark(bookmark);
      }

      if (name === 'undo') {
        this._undo?.undo();
        this._checkEmpty();
        this._updateToolbarState();
        this._updateHistoryButtons();
        return true;
      }

      if (name === 'redo') {
        this._undo?.redo();
        this._checkEmpty();
        this._updateToolbarState();
        this._updateHistoryButtons();
        return true;
      }

      this._undo?.record();

      const args = value === undefined ? [] : [value];
      const pluginHandled = this._registry?.execCommand(name, ...args);
      if (pluginHandled) {
        this._undo?.record();
        this._updateToolbarState();
        return true;
      }

      const coreHandled = this._commands?.exec(name, ...args);
      if (coreHandled) {
        this._undo?.record();
        this._updateToolbarState();
        return true;
      }

      return false;
    } finally {
      this._isExecutingCommand = false;
      if (!this._modal.dialog.open) {
        const sourceInput = this.querySelector('[data-source-input]');
        if (
          this.getAttribute('data-mode') === 'source'
          && sourceInput instanceof HTMLTextAreaElement
        ) {
          sourceInput.focus({ preventScroll: true });
        } else {
          this._content.focus({ preventScroll: true });
        }
      }
    }
  }

  /**
   * @param {import('./shared/plugin-registry.js').NexusPlugin} plugin
   */
  use(plugin) {
    if (this._plugins.includes(plugin)) {
      return;
    }

    this._plugins.push(plugin);
    this._registry?.use(plugin);
    this._updateToolbarState();
  }

  destroy() {
    this._teardown();
    this.remove();
  }

  get toolbar() {
    return this._toolbar;
  }

  get modal() {
    return this._modal;
  }

  get contentElement() {
    return this._content;
  }

  get scrollerElement() {
    return this._scroller;
  }

  get bus() {
    return this._bus;
  }

  get selection() {
    return this._selection;
  }

  updateToolbarState() {
    this._updateToolbarState();
  }

  recordUndo() {
    this._undo?.record();
  }

  /**
   * Resolved editor configuration. Assigning a new object merges with the current values.
   * @returns {import('./editor-config.js').NexusEditorConfig}
   */
  get config() {
    return {
      height: this._config.height,
      toolbar: [...this._config.toolbar],
    };
  }

  /**
   * @param {import('./editor-config.js').NexusEditorConfigInput} value
   */
  set config(value) {
    this.configure(value ?? {});
  }
}

ensureContentStyles();

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, NexusEditorElement);
}

/**
 * Creates a nexus-editor element. Call `destroy()` to remove listeners and detach from the DOM.
 * @param {import('./editor-config.js').NexusEditorConfigInput} [config]
 * @returns {{ element: NexusEditorElement, destroy: () => void }}
 */
export function createNexusEditor(config) {
  const element = document.createElement(TAG_NAME);
  if (config !== undefined) {
    element.configure(config);
  }
  return {
    element,
    destroy() {
      element.destroy();
    },
  };
}

export { NexusEditorElement, TAG_NAME };
export {
  DEFAULT_EDITOR_HEIGHT,
  DEFAULT_TOOLBAR,
  TOOLBAR_SEPARATOR,
} from './editor-config.js';
