import { createToolbarIcon } from '../icons/icons.js';
import {
  TOOLBAR_SEPARATOR,
  resolveToolbarLayout,
} from '../../shared/toolbar-layout.js';

const TAG_NAME = 'nexus-toolbar';

const PINNED_TOOLBAR_IDS = new Set([
  'undo',
  'redo',
  'formatBlock',
  'bold',
  'italic',
  'underline',
]);

const OVERFLOW_PRIORITY = {
  toggleSource: 10,
  insertImage: 20,
  insertLink: 30,
  insertOrderedList: 40,
  insertUnorderedList: 50,
};

/**
 * @typedef {{ command: string, label: string, text?: string, icon?: Node | (() => Node), type?: 'toggle' | 'button', value?: string, disabled?: boolean, options?: { value: string, label: string }[] }} NexusToolbarItem
 */

function resolveToolbarIcon(icon) {
  if (typeof icon === 'function') {
    return icon();
  }
  if (icon instanceof Node) {
    return icon.cloneNode(true);
  }
  return undefined;
}

class NexusToolbarElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./nexus-toolbar.css', import.meta.url).href;
    this.shadowRoot.appendChild(link);

    this._toolbar = document.createElement('div');
    this._toolbar.setAttribute('role', 'toolbar');
    this._toolbar.setAttribute('aria-label', 'Formatação de texto');
    this._toolbar.className = 'toolbar';
    this._toolbar.part = 'toolbar';
    this.shadowRoot.appendChild(this._toolbar);

    this._flyout = document.createElement('div');
    this._flyout.className = 'toolbar-flyout';
    this._flyout.setAttribute('data-toolbar-flyout', '');
    this.shadowRoot.appendChild(this._flyout);

    /** @type {HTMLButtonElement[]} */
    this._toggleButtons = [];
    /** @type {{ wrap: HTMLElement, trigger: HTMLButtonElement, menu: HTMLElement, label: HTMLElement, items: HTMLButtonElement[] }[]} */
    this._menus = [];
    /** @type {{ wrap: HTMLElement, trigger: HTMLButtonElement, menu: HTMLElement, label: HTMLElement, items: HTMLButtonElement[] } | null} */
    this._openMenu = null;
    /** @type {((command: string, value?: string) => void) | null} */
    this._onCommand = null;
    /** @type {Map<string, NexusToolbarItem>} */
    this._catalog = new Map();
    /** @type {string[] | null} */
    this._requestedLayout = null;
    /** @type {(() => void)[]} */
    this._mountedTeardowns = [];
    /** @type {Map<string, HTMLElement>} */
    this._mountedElements = new Map();
    /** @type {string[]} */
    this._mountedOrder = [];
    /** @type {{ wrap: HTMLElement, trigger: HTMLButtonElement, menu: HTMLElement, label: HTMLElement, items: HTMLButtonElement[] } | null} */
    this._overflowEntry = null;
    /** @type {ResizeObserver | null} */
    this._overflowObserver = null;
  }

  connectedCallback() {
    this.shadowRoot.addEventListener('click', this._handleClick);
    this.shadowRoot.addEventListener('mousedown', this._handleMouseDown);
    this.shadowRoot.addEventListener('mouseover', this._handleMouseOver);
    this.shadowRoot.addEventListener('mouseout', this._handleMouseOut);
    this.shadowRoot.addEventListener('focusin', this._handleFocusIn);
    this.shadowRoot.addEventListener('focusout', this._handleFocusOut);
    this.shadowRoot.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('pointerdown', this._handleDocumentPointerDown);
    window.addEventListener('resize', this._handleReposition);
    this._observeOverflow();
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('click', this._handleClick);
    this.shadowRoot.removeEventListener('mousedown', this._handleMouseDown);
    this.shadowRoot.removeEventListener('mouseover', this._handleMouseOver);
    this.shadowRoot.removeEventListener('mouseout', this._handleMouseOut);
    this.shadowRoot.removeEventListener('focusin', this._handleFocusIn);
    this.shadowRoot.removeEventListener('focusout', this._handleFocusOut);
    this.shadowRoot.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener(
      'pointerdown',
      this._handleDocumentPointerDown,
    );
    window.removeEventListener('resize', this._handleReposition);
    this._overflowObserver?.disconnect();
    this._overflowObserver = null;
  }

  _commandButtonFromEvent(event) {
    const target = /** @type {HTMLElement | null} */ (event.target);
    return target?.closest?.('[data-command]') ?? null;
  }

  _handleClick = (event) => {
    const trigger = /** @type {HTMLElement} */ (event.target).closest?.(
      '[data-menu-trigger]',
    );
    if (trigger) {
      const menu = this._menus.find((entry) => entry.trigger === trigger);
      if (menu) {
        this._toggleMenu(menu);
      }
      return;
    }

    const button = this._commandButtonFromEvent(event);
    if (!button || button.disabled) {
      return;
    }

    const command = button.getAttribute('data-command');
    const value = button.getAttribute('data-value') ?? undefined;
    this._closeMenu();
    this._onCommand?.(command, value);
  };

  _handleMouseDown = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (!target.closest?.('button')) {
      return;
    }

    event.preventDefault();
    this.dispatchEvent(
      new CustomEvent('nexus:toolbar-pointerdown', {
        bubbles: true,
        composed: true,
      }),
    );
  };

  _handleMouseOver = (event) => {
    const button = this._tooltipTargetFromEvent(event);
    if (button) {
      this._emitTooltip(button, true);
    }
  };

  _handleMouseOut = (event) => {
    const button = this._tooltipTargetFromEvent(event);
    if (button) {
      this._emitTooltip(button, false);
    }
  };

  _handleFocusIn = (event) => {
    const button = this._tooltipTargetFromEvent(event);
    if (button) {
      this._emitTooltip(button, true);
    }
  };

  _handleFocusOut = (event) => {
    const button = this._tooltipTargetFromEvent(event);
    if (button) {
      this._emitTooltip(button, false);
    }
  };

  _handleKeyDown = (event) => {
    if (event.key === 'Tab' && this._openMenu) {
      this._closeMenu();
      return;
    }

    if (event.key === 'Escape' && this._openMenu) {
      event.preventDefault();
      const trigger = this._openMenu.trigger;
      this._closeMenu();
      trigger.focus();
      return;
    }

    const target = /** @type {HTMLElement} */ (event.target);
    const trigger = target.closest?.('[data-menu-trigger]');
    if (trigger) {
      const menu = this._menus.find((entry) => entry.trigger === trigger);
      if (menu) {
        this._handleTriggerKeyDown(event, menu);
      }
      return;
    }

    if (
      this._openMenu
      && target.closest?.('[role="menuitemradio"], [role="menuitem"]')
    ) {
      this._handleMenuKeyDown(event, this._openMenu);
    }
  };

  _handleTriggerKeyDown(event, menu) {
    const isOpen = this._openMenu === menu;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        this._toggleMenu(menu);
      }
      const index =
        event.key === 'ArrowUp'
          ? menu.items.length - 1
          : this._activeItemIndex(menu);
      this._focusMenuItem(menu, index);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._toggleMenu(menu);
      if (this._openMenu === menu) {
        this._focusMenuItem(menu, this._activeItemIndex(menu));
      }
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this._focusMenuItem(menu, 0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this._focusMenuItem(menu, menu.items.length - 1);
    }
  }

  _handleMenuKeyDown(event, menu) {
    const currentIndex = menu.items.indexOf(
      /** @type {HTMLButtonElement} */ (
        event.target.closest('[role="menuitemradio"], [role="menuitem"]')
      ),
    );
    const lastIndex = menu.items.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this._focusMenuItem(
        menu,
        currentIndex < lastIndex ? currentIndex + 1 : 0,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this._focusMenuItem(
        menu,
        currentIndex > 0 ? currentIndex - 1 : lastIndex,
      );
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this._focusMenuItem(menu, 0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this._focusMenuItem(menu, lastIndex);
    }
  }

  _handleDocumentPointerDown = (event) => {
    if (!this._openMenu) {
      return;
    }

    const path = event.composedPath();
    if (!path.includes(this._openMenu.wrap) && !path.includes(this._openMenu.menu)) {
      this._closeMenu();
    }
  };

  _handleReposition = () => {
    if (this._openMenu) {
      this._positionMenu(this._openMenu);
    }
  };

  _tooltipTargetFromEvent(event) {
    const target = /** @type {HTMLElement | null} */ (event.target);
    return target?.closest?.('[data-command], [data-menu-trigger]') ?? null;
  }

  _emitTooltip(button, isVisible) {
    const label = button.getAttribute('aria-label');
    if (!label) {
      return;
    }

    if (isVisible && this._openMenu?.trigger === button) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent(
        isVisible ? 'nexus:toolbar-tooltip-show' : 'nexus:toolbar-tooltip-hide',
        {
          bubbles: true,
          composed: true,
          detail: { button, label },
        },
      ),
    );
  }

  _positionMenu(menu) {
    const triggerRect = menu.trigger.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    menu.menu.style.top = `${triggerRect.bottom - hostRect.top + 4}px`;
    menu.menu.style.left = `${triggerRect.left - hostRect.left}px`;
  }

  _toggleMenu(menu) {
    if (this._openMenu === menu) {
      this._closeMenu();
      return;
    }

    this._closeMenu();
    this._flyout.appendChild(menu.menu);
    menu.menu.hidden = false;
    menu.trigger.setAttribute('aria-expanded', 'true');
    this._openMenu = menu;
    this._positionMenu(menu);
    this._emitTooltip(menu.trigger, false);
  }

  _closeMenu() {
    if (!this._openMenu) {
      return;
    }

    this._openMenu.menu.hidden = true;
    this._openMenu.menu.style.removeProperty('top');
    this._openMenu.menu.style.removeProperty('left');
    this._openMenu.wrap.appendChild(this._openMenu.menu);
    this._openMenu.trigger.setAttribute('aria-expanded', 'false');
    this._openMenu = null;
  }

  _activeItemIndex(menu) {
    const checked = menu.items.findIndex(
      (item) => item.getAttribute('aria-checked') === 'true',
    );
    return checked === -1 ? 0 : checked;
  }

  _focusMenuItem(menu, index) {
    menu.items[index]?.focus();
  }

  /** @param {(command: string, value?: string) => void} handler */
  setCommandHandler(handler) {
    this._onCommand = handler;
  }

  /**
   * @param {string} id
   * @param {NexusToolbarItem} definition
   * @returns {() => void}
   */
  registerItem(id, definition) {
    if (!id) {
      console.warn('nexus-toolbar: registerItem requires a non-empty id');
      return () => {};
    }

    this._catalog.set(id, definition);
    this._remountIfApplied();

    return () => {
      this._catalog.delete(id);
      this._remountIfApplied();
    };
  }

  /**
   * @param {string[]} itemIds
   */
  applyLayout(itemIds) {
    this._requestedLayout = Array.isArray(itemIds) ? [...itemIds] : [];
    this._mountRequested();
  }

  getRegisteredIds() {
    return new Set(this._catalog.keys());
  }

  _remountIfApplied() {
    if (this._requestedLayout) {
      this._mountRequested();
    }
  }

  _mountRequested() {
    this._closeMenu();
    for (const teardown of this._mountedTeardowns) {
      teardown();
    }
    this._mountedTeardowns = [];
    this._mountedElements.clear();
    this._mountedOrder = [];

    const visible = resolveToolbarLayout(
      this._requestedLayout ?? [],
      this.getRegisteredIds(),
    );

    for (let index = 0; index < visible.length; index += 1) {
      const id = visible[index];
      const mountKey = id === TOOLBAR_SEPARATOR ? `${id}:${index}` : id;
      this._mountedOrder.push(mountKey);
      if (id === TOOLBAR_SEPARATOR) {
        const teardown = this.addButton({
          command: '',
          label: '',
          separator: true,
          id: TOOLBAR_SEPARATOR,
        });
        this._mountedTeardowns.push(teardown);
        const separators = this._toolbar.querySelectorAll(
          `[data-toolbar-item="${TOOLBAR_SEPARATOR}"]`,
        );
        const separator = separators[separators.length - 1];
        if (separator instanceof HTMLElement) {
          this._mountedElements.set(mountKey, separator);
        }
        continue;
      }

      const definition = this._catalog.get(id);
      if (!definition) {
        continue;
      }

      this._mountedTeardowns.push(this._mountDefinition(id, definition));
      const element = [...this._toolbar.children].find(
        (child) =>
          child instanceof HTMLElement
          && child.getAttribute('data-toolbar-item') === id,
      );
      if (element instanceof HTMLElement) {
        this._mountedElements.set(mountKey, element);
      }
    }

    this._ensureOverflowMenu();
    if (this._overflowEntry) {
      this._toolbar.appendChild(this._overflowEntry.wrap);
    }
    this._syncOverflowLayout();
  }

  _ensureOverflowMenu() {
    if (this._overflowEntry) {
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'toolbar__menu-wrap toolbar__overflow-wrap';
    wrap.hidden = true;
    wrap.setAttribute('data-toolbar-overflow', '');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'toolbar__menu-trigger';
    trigger.setAttribute('data-menu-trigger', '');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Mais ferramentas');

    const labelEl = document.createElement('span');
    labelEl.className = 'toolbar__menu-label';
    labelEl.textContent = 'Mais';
    trigger.append(labelEl, createToolbarIcon('chevronDown'));

    const menu = document.createElement('div');
    menu.className = 'toolbar__menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    wrap.append(trigger, menu);
    this._toolbar.appendChild(wrap);

    this._overflowEntry = { wrap, trigger, menu, label: labelEl, items: [] };
    this._menus.push(this._overflowEntry);
  }

  _observeOverflow() {
    if (this._overflowObserver || typeof ResizeObserver === 'undefined') {
      return;
    }

    this._overflowObserver = new ResizeObserver(() => {
      this._syncOverflowLayout();
    });
    this._overflowObserver.observe(this._toolbar);
  }

  _toolbarOverflows() {
    return this._toolbar.scrollWidth > this._toolbar.clientWidth + 1;
  }

  _setElementHidden(id, hidden) {
    const element = this._mountedElements.get(id);
    if (element) {
      element.hidden = hidden;
    }
  }

  _hideOrphanSeparators(hiddenIds) {
    for (let index = 0; index < this._mountedOrder.length; index += 1) {
      const mountKey = this._mountedOrder[index];
      if (!mountKey.startsWith(`${TOOLBAR_SEPARATOR}:`)) {
        continue;
      }

      const hasVisibleBefore = this._mountedOrder
        .slice(0, index)
        .some((candidate) =>
          !candidate.startsWith(`${TOOLBAR_SEPARATOR}:`) && !hiddenIds.has(candidate),
        );
      const hasVisibleAfter = this._mountedOrder
        .slice(index + 1)
        .some((candidate) =>
          !candidate.startsWith(`${TOOLBAR_SEPARATOR}:`) && !hiddenIds.has(candidate),
        );

      this._setElementHidden(mountKey, !hasVisibleBefore || !hasVisibleAfter);
    }
  }

  _resolveCatalogId(mountKey) {
    if (mountKey.startsWith(`${TOOLBAR_SEPARATOR}:`)) {
      return TOOLBAR_SEPARATOR;
    }
    return mountKey;
  }

  _findOverflowCandidate(hiddenIds) {
    /** @type {{ mountKey: string, priority: number }[]} */
    const candidates = [];

    for (const mountKey of this._mountedOrder) {
      const id = this._resolveCatalogId(mountKey);
      if (
        id === TOOLBAR_SEPARATOR
        || hiddenIds.has(mountKey)
        || PINNED_TOOLBAR_IDS.has(id)
      ) {
        continue;
      }
      candidates.push({
        mountKey,
        priority: OVERFLOW_PRIORITY[id] ?? 100,
      });
    }

    candidates.sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return (
        this._mountedOrder.indexOf(right.mountKey)
        - this._mountedOrder.indexOf(left.mountKey)
      );
    });

    return candidates[0]?.mountKey ?? null;
  }

  _renderOverflowMenu(hiddenIds) {
    if (!this._overflowEntry) {
      return;
    }

    const { wrap, menu } = this._overflowEntry;
    menu.replaceChildren();
    this._overflowEntry.items = [];

    for (const mountKey of this._mountedOrder) {
      if (!hiddenIds.has(mountKey) || mountKey.startsWith(`${TOOLBAR_SEPARATOR}:`)) {
        continue;
      }

      const id = this._resolveCatalogId(mountKey);
      const definition = this._catalog.get(id);
      if (!definition) {
        continue;
      }

      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'toolbar__menu-item toolbar__overflow-item';
      item.tabIndex = -1;
      item.setAttribute('role', 'menuitem');
      item.setAttribute('data-command', definition.command);
      item.setAttribute('data-toolbar-item', id);
      item.textContent = definition.label;
      if (definition.type === 'toggle') {
        const sourceButton = this._findCommandButton(definition.command, definition.value);
        item.setAttribute(
          'aria-pressed',
          sourceButton?.getAttribute('aria-pressed') ?? 'false',
        );
      }
      menu.appendChild(item);
      this._overflowEntry.items.push(item);
    }

    wrap.hidden = this._overflowEntry.items.length === 0;
  }

  _syncOverflowLayout() {
    if (!this._mountedOrder.length) {
      return;
    }

    /** @type {Set<string>} */
    const hiddenIds = new Set();

    for (const mountKey of this._mountedOrder) {
      this._setElementHidden(mountKey, false);
    }

    while (this._toolbarOverflows()) {
      const candidate = this._findOverflowCandidate(hiddenIds);
      if (!candidate) {
        break;
      }
      hiddenIds.add(candidate);
      this._setElementHidden(candidate, true);
      this._hideOrphanSeparators(hiddenIds);
    }

    this._hideOrphanSeparators(hiddenIds);
    this._renderOverflowMenu(hiddenIds);
  }

  /**
   * @param {string} id
   * @param {NexusToolbarItem} definition
   * @returns {() => void}
   */
  _mountDefinition(id, definition) {
    if (Array.isArray(definition.options)) {
      return this.addMenu({ ...definition, id });
    }

    return this.addButton({
      ...definition,
      id,
      icon: resolveToolbarIcon(definition.icon),
    });
  }

  /**
   * @param {{ command: string, label: string, text?: string, icon?: Node | (() => Node), type?: 'toggle' | 'button', value?: string, separator?: boolean, disabled?: boolean, id?: string }} config
   * @returns {() => void}
   */
  addButton({
    command,
    label,
    text,
    icon,
    type = 'button',
    value,
    separator = false,
    disabled = false,
    id,
  }) {
    if (separator) {
      const sep = document.createElement('div');
      sep.className = 'toolbar__separator';
      sep.setAttribute('role', 'separator');
      sep.setAttribute('aria-orientation', 'vertical');
      if (id) {
        sep.setAttribute('data-toolbar-item', id);
      }
      this._toolbar.appendChild(sep);
      return () => sep.remove();
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toolbar__button';
    button.part = 'button';
    button.setAttribute('data-command', command);
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    if (id) {
      button.setAttribute('data-toolbar-item', id);
    }

    const resolvedIcon = resolveToolbarIcon(icon);
    if (resolvedIcon instanceof Node) {
      button.appendChild(resolvedIcon);
    } else {
      button.textContent = text ?? label;
    }

    if (value) {
      button.setAttribute('data-value', value);
    }

    if (type === 'toggle') {
      button.setAttribute('aria-pressed', 'false');
      this._toggleButtons.push(button);
    }

    this._toolbar.appendChild(button);

    return () => {
      const index = this._toggleButtons.indexOf(button);
      if (index !== -1) {
        this._toggleButtons.splice(index, 1);
      }
      button.remove();
    };
  }

  /**
   * @param {{ command: string, label: string, options: { value: string, label: string }[], id?: string }} config
   * @returns {() => void}
   */
  addMenu({ command, label, options, id }) {
    const wrap = document.createElement('div');
    wrap.className = 'toolbar__menu-wrap';
    if (id) {
      wrap.setAttribute('data-toolbar-item', id);
    }

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'toolbar__menu-trigger';
    trigger.setAttribute('data-menu-trigger', '');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', label);

    const labelEl = document.createElement('span');
    labelEl.className = 'toolbar__menu-label';
    labelEl.textContent = options[0]?.label ?? label;
    trigger.append(labelEl, createToolbarIcon('chevronDown'));

    const menu = document.createElement('div');
    menu.className = 'toolbar__menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    /** @type {HTMLButtonElement[]} */
    const items = [];
    for (const option of options) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'toolbar__menu-item';
      item.tabIndex = -1;
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('data-command', command);
      item.setAttribute('data-value', option.value);
      item.setAttribute('aria-checked', 'false');
      item.textContent = option.label;
      menu.appendChild(item);
      items.push(item);
    }

    wrap.append(trigger, menu);
    this._toolbar.appendChild(wrap);

    const entry = { wrap, trigger, menu, label: labelEl, items };
    this._menus.push(entry);

    return () => {
      if (this._openMenu === entry) {
        this._closeMenu();
      }
      const index = this._menus.indexOf(entry);
      if (index !== -1) {
        this._menus.splice(index, 1);
      }
      wrap.remove();
    };
  }

  setPressed(command, pressed, value) {
    for (const button of this._commandControls(command, value)) {
      button.setAttribute('aria-pressed', String(pressed));
    }
  }

  setLabel(command, label, value) {
    for (const [id, definition] of this._catalog) {
      if (definition.command === command && definition.value === value) {
        this._catalog.set(id, { ...definition, label });
      }
    }

    for (const button of this._commandControls(command, value)) {
      button.setAttribute('aria-label', label);
      if (button.classList.contains('toolbar__overflow-item')) {
        button.textContent = label;
      }
    }
  }

  setIcon(command, icon, value) {
    const button = this._findCommandButton(command, value);
    if (button && icon instanceof Node && !button.closest('[role="menu"]')) {
      button.replaceChildren(icon);
    }
  }

  setDisabled(command, disabled) {
    const button = this._findCommandButton(command);
    if (button) {
      button.disabled = disabled;
    }
  }

  /** @param {(command: string, value?: string) => boolean} isPressed */
  updatePressed(isPressed) {
    for (const button of this._toggleButtons) {
      const command = button.getAttribute('data-command');
      const value = button.getAttribute('data-value') ?? undefined;
      button.setAttribute(
        'aria-pressed',
        String(Boolean(isPressed(command, value))),
      );
    }

    for (const menu of this._menus) {
      let activeLabel = menu.items[0]?.textContent ?? '';
      for (const item of menu.items) {
        const command = item.getAttribute('data-command');
        const value = item.getAttribute('data-value') ?? undefined;
        const isActive = Boolean(isPressed(command, value));
        if (item.getAttribute('role') === 'menuitemradio') {
          item.setAttribute('aria-checked', String(isActive));
        } else if (item.getAttribute('aria-pressed') !== null) {
          item.setAttribute('aria-pressed', String(isActive));
        }
        if (isActive && item.getAttribute('role') === 'menuitemradio') {
          activeLabel = item.textContent ?? activeLabel;
        }
      }
      if (menu !== this._overflowEntry) {
        menu.label.textContent = activeLabel;
      }
    }
  }

  getButton(command, value) {
    return this._findToggleButton(command, value);
  }

  _commandControls(command, value) {
    return [...this.shadowRoot.querySelectorAll('button[data-command]')].filter(
      (node) => {
        if (
          !(node instanceof HTMLButtonElement)
          || node.getAttribute('data-command') !== command
        ) {
          return false;
        }
        if (value === undefined) {
          return !node.hasAttribute('data-value');
        }
        return node.getAttribute('data-value') === value;
      },
    );
  }

  _findCommandButton(command, value) {
    return (
      this._commandControls(command, value).find(
        (node) => !node.closest('[role="menu"]'),
      )
      ?? this._commandControls(command, value)[0]
      ?? null
    );
  }

  _findToggleButton(command, value) {
    return this._toggleButtons.find((button) => {
      if (button.getAttribute('data-command') !== command) {
        return false;
      }
      if (value === undefined) {
        return true;
      }
      return button.getAttribute('data-value') === value;
    });
  }
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, NexusToolbarElement);
}

export { NexusToolbarElement, TAG_NAME };
