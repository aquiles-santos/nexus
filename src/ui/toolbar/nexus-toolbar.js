import { createToolbarIcon } from '../icons/icons.js';
import {
  TOOLBAR_SEPARATOR,
  resolveToolbarLayout,
} from '../../shared/toolbar-layout.js';

const TAG_NAME = 'nexus-toolbar';

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
  }

  connectedCallback() {
    this._toolbar.addEventListener('click', this._handleClick);
    this._toolbar.addEventListener('mousedown', this._handleMouseDown);
    this._toolbar.addEventListener('mouseover', this._handleMouseOver);
    this._toolbar.addEventListener('mouseout', this._handleMouseOut);
    this._toolbar.addEventListener('focusin', this._handleFocusIn);
    this._toolbar.addEventListener('focusout', this._handleFocusOut);
    this._toolbar.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('pointerdown', this._handleDocumentPointerDown);
  }

  disconnectedCallback() {
    this._toolbar.removeEventListener('click', this._handleClick);
    this._toolbar.removeEventListener('mousedown', this._handleMouseDown);
    this._toolbar.removeEventListener('mouseover', this._handleMouseOver);
    this._toolbar.removeEventListener('mouseout', this._handleMouseOut);
    this._toolbar.removeEventListener('focusin', this._handleFocusIn);
    this._toolbar.removeEventListener('focusout', this._handleFocusOut);
    this._toolbar.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener(
      'pointerdown',
      this._handleDocumentPointerDown,
    );
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

    if (this._openMenu && target.closest?.('[role="menuitemradio"]')) {
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
        event.target.closest('[role="menuitemradio"]')
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

    if (!event.composedPath().includes(this._openMenu.wrap)) {
      this._closeMenu();
    }
  };

  _tooltipTargetFromEvent(event) {
    const target = /** @type {HTMLElement | null} */ (event.target);
    return target?.closest?.('[aria-label]') ?? null;
  }

  _emitTooltip(button, isVisible) {
    const label = button.getAttribute('aria-label');
    if (!label) {
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

  _toggleMenu(menu) {
    if (this._openMenu === menu) {
      this._closeMenu();
      return;
    }

    this._closeMenu();
    menu.menu.hidden = false;
    menu.trigger.setAttribute('aria-expanded', 'true');
    this._openMenu = menu;
  }

  _closeMenu() {
    if (!this._openMenu) {
      return;
    }

    this._openMenu.menu.hidden = true;
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

    const visible = resolveToolbarLayout(
      this._requestedLayout ?? [],
      this.getRegisteredIds(),
    );

    for (const id of visible) {
      if (id === TOOLBAR_SEPARATOR) {
        this._mountedTeardowns.push(
          this.addButton({
            command: '',
            label: '',
            separator: true,
            id,
          }),
        );
        continue;
      }

      const definition = this._catalog.get(id);
      if (!definition) {
        continue;
      }
      this._mountedTeardowns.push(this._mountDefinition(id, definition));
    }
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
      const index = this._menus.indexOf(entry);
      if (index !== -1) {
        this._menus.splice(index, 1);
      }
      if (this._openMenu === entry) {
        this._openMenu = null;
      }
      wrap.remove();
    };
  }

  setPressed(command, pressed, value) {
    const button = this._findCommandButton(command, value);
    if (button) {
      button.setAttribute('aria-pressed', String(pressed));
    }
  }

  setLabel(command, label, value) {
    const button = this._findCommandButton(command, value);
    if (button) {
      button.setAttribute('aria-label', label);
    }
  }

  setIcon(command, icon, value) {
    const button = this._findCommandButton(command, value);
    if (button && icon instanceof Node) {
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
        item.setAttribute('aria-checked', String(isActive));
        if (isActive) {
          activeLabel = item.textContent ?? activeLabel;
        }
      }
      menu.label.textContent = activeLabel;
    }
  }

  getButton(command, value) {
    return this._findToggleButton(command, value);
  }

  _findCommandButton(command, value) {
    return (
      [...this._toolbar.querySelectorAll('button[data-command]')].find(
        (node) => {
          if (
            !(node instanceof HTMLButtonElement) ||
            node.getAttribute('data-command') !== command
          ) {
            return false;
          }
          if (node.closest('[role="menu"]')) {
            return (
              value !== undefined && node.getAttribute('data-value') === value
            );
          }
          if (value === undefined) {
            return true;
          }
          return node.getAttribute('data-value') === value;
        },
      ) ?? null
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
