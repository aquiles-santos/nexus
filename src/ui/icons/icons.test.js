import { describe, it, expect } from 'vitest'
import { createToolbarIcon } from './icons.js'

describe('toolbar icons', () => {
  it('creates an svg icon for a known name', () => {
    const icon = createToolbarIcon('link')

    expect(icon.tagName).toBe('svg')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.querySelector('path')).not.toBeNull()
  })
})
