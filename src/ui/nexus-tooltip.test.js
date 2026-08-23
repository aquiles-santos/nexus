import { describe, it, expect, beforeEach } from 'vitest'
import './nexus-tooltip.js'

describe('nexus-tooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shows and hides tooltip text', () => {
    const tooltip = document.createElement('nexus-tooltip')
    const button = document.createElement('button')
    document.body.append(tooltip, button)

    tooltip.show(button, 'Dica')
    expect(tooltip.hasAttribute('data-visible')).toBe(true)
    expect(tooltip.shadowRoot.querySelector('.tooltip').textContent).toBe('Dica')
    expect(button.getAttribute('aria-describedby')).toBeNull()

    tooltip.hide()
    expect(tooltip.hasAttribute('data-visible')).toBe(false)
    expect(button.hasAttribute('aria-describedby')).toBe(false)
  })
})
