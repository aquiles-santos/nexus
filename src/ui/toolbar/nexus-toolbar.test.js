import { describe, it, expect, beforeEach, vi } from 'vitest'
import './nexus-toolbar.js'

describe('nexus-toolbar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders with toolbar role', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)

    const inner = toolbar.shadowRoot.querySelector('[role="toolbar"]')
    expect(inner).not.toBeNull()
    expect(inner.getAttribute('aria-label')).toBe('Formatação de texto')
  })

  it('adds buttons and fires command handler', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)

    const handler = vi.fn()
    toolbar.setCommandHandler(handler)
    toolbar.addButton({ command: 'bold', label: 'Negrito', type: 'toggle' })

    const button = toolbar.shadowRoot.querySelector('[data-command="bold"]')
    button.click()

    expect(handler).toHaveBeenCalledWith('bold', undefined)
  })

  it('updates aria-pressed state', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)

    toolbar.addButton({ command: 'bold', label: 'Negrito', type: 'toggle' })
    toolbar.setPressed('bold', true)

    const button = toolbar.shadowRoot.querySelector('[data-command="bold"]')
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('updates pressed state for block buttons by value', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)

    toolbar.addButton({ command: 'formatBlock', label: 'Título 1', value: 'h1', type: 'toggle' })
    toolbar.addButton({ command: 'formatBlock', label: 'Título 2', value: 'h2', type: 'toggle' })
    toolbar.updatePressed((command, value) => command === 'formatBlock' && value === 'h1')

    expect(toolbar.shadowRoot.querySelector('[data-value="h1"]').getAttribute('aria-pressed')).toBe('true')
    expect(toolbar.shadowRoot.querySelector('[data-value="h2"]').getAttribute('aria-pressed')).toBe('false')
  })

  it('prevents default on command mousedown', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)
    toolbar.addButton({ command: 'bold', label: 'Negrito', type: 'toggle' })

    const pointerHandler = vi.fn()
    toolbar.addEventListener('nexus:toolbar-pointerdown', pointerHandler)

    const button = toolbar.shadowRoot.querySelector('[data-command="bold"]')
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true })
    button.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(pointerHandler).toHaveBeenCalled()
  })

  it('shows tooltip on keyboard focus', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)
    toolbar.addButton({ command: 'bold', label: 'Negrito', type: 'toggle' })

    const showHandler = vi.fn()
    toolbar.addEventListener('nexus:toolbar-tooltip-show', showHandler)

    const button = toolbar.shadowRoot.querySelector('[data-command="bold"]')
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))

    expect(showHandler).toHaveBeenCalled()
    expect(showHandler.mock.calls[0][0].detail.label).toBe('Negrito')
  })

  it('delays tooltip on hover', () => {
    vi.useFakeTimers()

    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)
    toolbar.addButton({ command: 'bold', label: 'Negrito', type: 'toggle' })

    const showHandler = vi.fn()
    toolbar.addEventListener('nexus:toolbar-tooltip-show', showHandler)

    const button = toolbar.shadowRoot.querySelector('[data-command="bold"]')
    button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }))

    expect(showHandler).not.toHaveBeenCalled()

    vi.advanceTimersByTime(400)
    expect(showHandler).toHaveBeenCalled()
    expect(showHandler.mock.calls[0][0].detail.label).toBe('Negrito')

    vi.useRealTimers()
  })

  it('adds a block style menu and fires formatBlock', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)

    const handler = vi.fn()
    toolbar.setCommandHandler(handler)
    toolbar.addMenu({
      command: 'formatBlock',
      label: 'Estilo do bloco',
      options: [
        { value: 'p', label: 'Parágrafo' },
        { value: 'h1', label: 'Título 1' },
      ],
    })

    const trigger = toolbar.shadowRoot.querySelector('[data-menu-trigger]')
    trigger.click()

    const menu = toolbar.shadowRoot.querySelector('[role="menu"]')
    expect(menu.hidden).toBe(false)

    const headingItem = toolbar.shadowRoot.querySelector('[data-value="h1"]')
    headingItem.click()

    expect(handler).toHaveBeenCalledWith('formatBlock', 'h1')
    expect(menu.hidden).toBe(true)
  })

  it('updates menu checked option and trigger label', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)

    toolbar.addMenu({
      command: 'formatBlock',
      label: 'Estilo do bloco',
      options: [
        { value: 'p', label: 'Parágrafo' },
        { value: 'h1', label: 'Título 1' },
      ],
    })

    toolbar.updatePressed((command, value) => command === 'formatBlock' && value === 'h1')

    expect(toolbar.shadowRoot.querySelector('[data-value="h1"]').getAttribute('aria-checked')).toBe('true')
    expect(toolbar.shadowRoot.querySelector('[data-value="p"]').getAttribute('aria-checked')).toBe('false')
    expect(toolbar.shadowRoot.querySelector('.toolbar__menu-label').textContent).toBe('Título 1')
  })

  it('removes buttons when addButton teardown runs', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)

    const remove = toolbar.addButton({ command: 'bold', label: 'Negrito', type: 'toggle' })
    expect(toolbar.shadowRoot.querySelector('[data-command="bold"]')).not.toBeNull()

    remove()
    expect(toolbar.shadowRoot.querySelector('[data-command="bold"]')).toBeNull()
  })

  it('updates button label and icon without piercing internals from the host', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)
    toolbar.addButton({ command: 'toggleSource', label: 'Código' })

    const icon = document.createElement('span')
    icon.setAttribute('data-icon', 'eye')
    toolbar.setLabel('toggleSource', 'Visual')
    toolbar.setIcon('toggleSource', icon)
    toolbar.setPressed('toggleSource', true)

    const button = toolbar.shadowRoot.querySelector('[data-command="toggleSource"]')
    expect(button.getAttribute('aria-label')).toBe('Visual')
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.querySelector('[data-icon="eye"]')).not.toBeNull()
  })

  it('returns focus to the menu trigger on Escape', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)
    toolbar.addMenu({
      command: 'formatBlock',
      label: 'Estilo do bloco',
      options: [
        { value: 'p', label: 'Parágrafo' },
        { value: 'h1', label: 'Título 1' },
      ],
    })

    const trigger = toolbar.shadowRoot.querySelector('[data-menu-trigger]')
    trigger.click()

    const item = toolbar.shadowRoot.querySelector('[data-value="h1"]')
    item.focus()
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(toolbar.shadowRoot.querySelector('[role="menu"]').hidden).toBe(true)
    expect(toolbar.shadowRoot.activeElement).toBe(trigger)
  })

  it('opens the menu and focuses an item with ArrowDown', () => {
    const toolbar = document.createElement('nexus-toolbar')
    document.body.appendChild(toolbar)
    toolbar.addMenu({
      command: 'formatBlock',
      label: 'Estilo do bloco',
      options: [
        { value: 'p', label: 'Parágrafo' },
        { value: 'h1', label: 'Título 1' },
      ],
    })

    const trigger = toolbar.shadowRoot.querySelector('[data-menu-trigger]')
    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    expect(toolbar.shadowRoot.querySelector('[role="menu"]').hidden).toBe(false)
    expect(toolbar.shadowRoot.activeElement).toBe(toolbar.shadowRoot.querySelector('[data-value="p"]'))
  })
})
