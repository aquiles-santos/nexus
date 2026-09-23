/**
 * @typedef {Object} NexusPlugin
 * @property {string} name
 * @property {(editor: unknown) => void} init
 * @property {Record<string, (editor: unknown, ...args: unknown[]) => void>} commands
 * @property {Record<string, string>} [shortcuts]
 * @property {(editor: unknown) => void} destroy
 */

/**
 * @param {unknown} editor
 */
export function createPluginRegistry(editor) {
  /** @type {Map<string, { plugin: NexusPlugin, enabled: boolean }>} */
  const plugins = new Map();
  /** @type {Map<string, string>} */
  const shortcuts = new Map();
  /** @type {Map<string, (editor: unknown, ...args: unknown[]) => void>} */
  const commands = new Map();

  /** @param {NexusPlugin} plugin */
  function use(plugin) {
    if (plugins.has(plugin.name)) {
      return;
    }

    plugins.set(plugin.name, { plugin, enabled: true });

    for (const [name, handler] of Object.entries(plugin.commands)) {
      commands.set(name, handler);
    }

    if (plugin.shortcuts) {
      for (const [shortcut, command] of Object.entries(plugin.shortcuts)) {
        shortcuts.set(shortcut, command);
      }
    }

    plugin.init(editor);
  }

  function disable(name) {
    const entry = plugins.get(name);
    if (!entry || !entry.enabled) {
      return;
    }

    entry.enabled = false;
    entry.plugin.destroy(editor);

    for (const commandName of Object.keys(entry.plugin.commands)) {
      commands.delete(commandName);
    }

    if (entry.plugin.shortcuts) {
      for (const shortcut of Object.keys(entry.plugin.shortcuts)) {
        shortcuts.delete(shortcut);
      }
    }
  }

  function enable(name) {
    const entry = plugins.get(name);
    if (!entry || entry.enabled) {
      return;
    }

    entry.enabled = true;

    for (const [commandName, handler] of Object.entries(entry.plugin.commands)) {
      commands.set(commandName, handler);
    }

    if (entry.plugin.shortcuts) {
      for (const [shortcut, command] of Object.entries(entry.plugin.shortcuts)) {
        shortcuts.set(shortcut, command);
      }
    }

    entry.plugin.init(editor);
  }

  function execCommand(command, ...args) {
    const handler = commands.get(command);
    if (!handler) {
      return false;
    }
    handler(editor, ...args);
    return true;
  }

  function destroy() {
    for (const [name] of plugins) {
      disable(name);
    }
    plugins.clear();
    commands.clear();
    shortcuts.clear();
  }

  return {
    use,
    enable,
    disable,
    execCommand,
    destroy,
    getCommands: () => new Map(commands),
    getShortcuts: () => new Map(shortcuts),
  };
}

export function getShortcutKey(event) {
  const parts = [];
  if (event.ctrlKey || event.metaKey) {
    parts.push('Ctrl');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
  return parts.join('+');
}
