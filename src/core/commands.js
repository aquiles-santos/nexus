import { createFormatter } from './formatter.js';
import { INLINE_COMMAND_TAGS, isAllowedTag, isBlock } from './schema.js';

/**
 * @param {HTMLElement} root
 * @param {ReturnType<import('./selection.js').createSelectionManager>} selection
 */
export function createCommands(root, selection) {
  const formatter = createFormatter(root, selection);

  const handlers = {
    bold: () => formatter.toggleInline('strong'),
    italic: () => formatter.toggleInline('em'),
    underline: () => formatter.toggleInline('u'),
    formatBlock: (tag) => {
      if (!tag || typeof tag !== 'string') {
        return;
      }
      const normalized = tag.toLowerCase();
      if (!isAllowedTag(normalized) || !isBlock(normalized)) {
        return;
      }
      formatter.formatBlock(normalized);
    },
  };

  function exec(name, ...args) {
    const handler = handlers[name];
    if (!handler) {
      return false;
    }
    handler(...args);
    return true;
  }

  return {
    exec,
    formatter,
    handlers,
  };
}

export { INLINE_COMMAND_TAGS as INLINE_COMMANDS };
