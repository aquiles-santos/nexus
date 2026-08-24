import { sanitizeIncomingHtml } from './sanitizer.js';

/**
 * @param {string} html
 * @param {ReturnType<import('../shared/event-bus.js').createEventBus> | null | undefined} [bus]
 * @returns {DocumentFragment}
 */
export function parseHtml(html, bus) {
  const sanitized = sanitizeIncomingHtml(html, bus);
  const template = document.createElement('template');
  template.innerHTML = sanitized;
  return template.content;
}
