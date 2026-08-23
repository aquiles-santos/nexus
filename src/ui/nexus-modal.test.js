import { describe, it, expect, beforeEach } from 'vitest'
import './nexus-modal.js'

describe('nexus-modal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('opens and closes dialog', () => {
    const modal = document.createElement('nexus-modal')
    document.body.appendChild(modal)

    modal.open({
      title: 'Teste',
      content: 'Conteúdo',
      actions: [{ label: 'Fechar', action: () => {} }],
    })

    expect(modal.dialog.hasAttribute('open') || modal.dialog.open).toBe(true)
    expect(modal.dialog.getAttribute('aria-labelledby')).toBe('nexus-modal-title')
    expect(modal.dialog.querySelector('#nexus-modal-title').textContent).toBe('Teste')
    modal.close()
    expect(modal.dialog.hasAttribute('open')).toBe(false)
  })
})
