const TAG_NAME = 'nexus-tooltip';

class NexusTooltipElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./nexus-tooltip.css', import.meta.url).href;
    this.shadowRoot.appendChild(link);

    this._tooltip = document.createElement('div');
    this._tooltip.className = 'tooltip';
    this._tooltip.part = 'tooltip';
    this._tooltip.setAttribute('role', 'tooltip');
    this.shadowRoot.appendChild(this._tooltip);
  }

  show(target, text) {
    this._tooltip.textContent = text;
    this.setAttribute('data-visible', '');

    const rect = target.getBoundingClientRect();
    const hostRect = this.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };

    this.style.top = `${rect.bottom - hostRect.top + 4}px`;
    this.style.left = `${rect.left - hostRect.left}px`;
  }

  hide() {
    this.removeAttribute('data-visible');
  }
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, NexusTooltipElement);
}

export { NexusTooltipElement, TAG_NAME };
