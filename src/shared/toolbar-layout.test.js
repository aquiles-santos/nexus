import { describe, it, expect } from 'vitest'
import {
  TOOLBAR_SEPARATOR,
  compactToolbarItems,
  resolveToolbarLayout,
} from './toolbar-layout.js'

describe('toolbar-layout', () => {
  it('drops leading, trailing, and duplicate separators', () => {
    expect(
      compactToolbarItems(['|', 'bold', '|', '|', 'italic', '|']),
    ).toEqual(['bold', TOOLBAR_SEPARATOR, 'italic'])
  })

  it('keeps configured tools that are not registered yet out of the mounted layout', () => {
    expect(
      resolveToolbarLayout(['bold', 'insertLink', '|', 'italic'], ['bold', 'italic']),
    ).toEqual(['bold', TOOLBAR_SEPARATOR, 'italic'])
  })
})
