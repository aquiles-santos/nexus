const TAG_NAME = 'nexus-modal';

class NexusModalElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./nexus-modal.css', import.meta.url).href;
    this.shadowRoot.appendChild(link);

    this._dialog = document.createElement('dialog');
    this._dialog.part = 'dialog';
    this._dialog.innerHTML = `
      <h2 class="modal__title" part="title"></h2>
      <div class="modal__content" part="content"></div>
      <div class="modal__actions" part="actions"></div>
    `;
    this.shadowRoot.appendChild(this._dialog);

    this._title = this._dialog.querySelector('.modal__title');
    this._content = this._dialog.querySelector('.modal__content');
    this._actions = this._dialog.querySelector('.modal__actions');
    this._title.id = 'nexus-modal-title';
    this._dialog.setAttribute('aria-labelledby', this._title.id);

    this._dialog.addEventListener('close', this._handleClose);
    this._dialog.addEventListener('cancel', this._handleCancel);
  }

  disconnectedCallback() {
    this._dialog.removeEventListener('close', this._handleClose);
    this._dialog.removeEventListener('cancel', this._handleCancel);
  }

  _handleClose = () => {
    this.dispatchEvent(new CustomEvent('nexus:modal-close', { bubbles: true, composed: true }));
  };

  _handleCancel = (event) => {
    event.preventDefault();
    this.close();
  };

  /**
   * @param {{ title: string, content: HTMLElement | string, actions?: { label: string, primary?: boolean, action: () => void }[] }} options
   */
  open({ title, content, actions = [] }) {
    this._title.textContent = title;
    this._content.replaceChildren();

    if (typeof content === 'string') {
      this._content.textContent = content;
    } else {
      this._content.appendChild(content);
    }

    this._actions.replaceChildren();
    for (const { label, primary, action } of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = primary ? 'modal__button modal__button--primary' : 'modal__button';
      button.textContent = label;
      button.addEventListener('click', () => {
        action();
        if (!primary) {
          this.close();
        }
      });
      this._actions.appendChild(button);
    }

    if (typeof this._dialog.showModal === 'function') {
      this._dialog.showModal();
    } else {
      this._dialog.setAttribute('open', '');
    }
  }

  close() {
    if (typeof this._dialog.close === 'function' && this._dialog.open) {
      this._dialog.close();
    } else {
      this._dialog.removeAttribute('open');
    }
  }

  get dialog() {
    return this._dialog;
  }
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, NexusModalElement);
}

export { NexusModalElement, TAG_NAME };
