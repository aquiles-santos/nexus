/**
 * Merges Vue shortcut props onto `init`. A defined shortcut replaces the field.
 *
 * @param {{
 *   init?: Record<string, unknown> | null
 *   plugins?: unknown
 *   toolbar?: unknown
 *   height?: unknown
 *   placeholder?: unknown
 * }} props
 * @returns {Record<string, unknown>}
 */
export function resolveInit(props) {
  const init = { ...(props.init ?? {}) }

  if (props.plugins !== undefined) {
    init.plugins = props.plugins
  }
  if (props.toolbar !== undefined) {
    init.toolbar = props.toolbar
  }
  if (props.height !== undefined) {
    init.height = props.height
  }
  if (props.placeholder !== undefined) {
    init.placeholder = props.placeholder
  }

  return init
}

/**
 * @param {{ getContent: (options?: { format?: string }) => unknown } | null} editor
 * @param {unknown} next
 * @returns {boolean}
 */
export function shouldApplyModelValue(editor, next) {
  if (!editor || typeof next !== 'string') {
    return false
  }

  return next !== editor.getContent({ format: 'html' })
}
