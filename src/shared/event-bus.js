export function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  function on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    listeners.get(event)?.delete(handler);
  }

  function emit(event, detail) {
    for (const handler of listeners.get(event) ?? []) {
      handler(detail);
    }
  }

  function destroy() {
    listeners.clear();
  }

  return { on, off, emit, destroy };
}
