import { describe, it, expect } from 'vitest'
import { PLUGIN_CATALOG, resolvePlugins } from './catalog.js'
import { pluginBasicFormats } from './basic-formats/index.js'
import { pluginLists } from './lists/index.js'
import { pluginLink } from './link/index.js'

describe('plugin catalog', () => {
  it('maps MVP plugin names to built-in plugins', () => {
    expect(PLUGIN_CATALOG['basic-formats']).toBe(pluginBasicFormats)
    expect(PLUGIN_CATALOG.lists).toBe(pluginLists)
    expect(PLUGIN_CATALOG.link).toBe(pluginLink)
    expect(Object.keys(PLUGIN_CATALOG)).toEqual([
      'basic-formats',
      'lists',
      'link',
      'media',
      'paste-clean',
      'source-code',
    ])
  })

  it('resolves space-separated names from a string', () => {
    expect(resolvePlugins('lists link')).toEqual([pluginLists, pluginLink])
  })

  it('resolves an array of names', () => {
    expect(resolvePlugins(['basic-formats', 'lists'])).toEqual([
      pluginBasicFormats,
      pluginLists,
    ])
  })

  it('resolves a mix of catalog names and plugin objects', () => {
    const pluginCustom = {
      name: 'custom',
      init() {},
      commands: {},
      destroy() {},
    }

    expect(resolvePlugins(['lists', pluginCustom])).toEqual([pluginLists, pluginCustom])
  })

  it('returns no plugins for omitted, empty string, or empty array', () => {
    expect(resolvePlugins()).toEqual([])
    expect(resolvePlugins('')).toEqual([])
    expect(resolvePlugins('   ')).toEqual([])
    expect(resolvePlugins([])).toEqual([])
  })

  it('skips duplicate names while preserving the first occurrence', () => {
    expect(resolvePlugins('lists lists link')).toEqual([pluginLists, pluginLink])
    expect(resolvePlugins(['lists', pluginLists])).toEqual([pluginLists])
  })

  it('throws when a catalog name is unknown', () => {
    expect(() => resolvePlugins('lists unknown-plugin')).toThrow('Unknown plugin "unknown-plugin"')
    expect(() => resolvePlugins(['missing'])).toThrow('Unknown plugin "missing"')
  })

  it('throws for unsupported plugins input types', () => {
    expect(() => resolvePlugins(42)).toThrow(/must be a string/)
    expect(() => resolvePlugins(['lists', 1])).toThrow(/catalog names or plugin objects/)
  })
})
