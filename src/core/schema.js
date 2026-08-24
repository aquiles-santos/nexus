const ALLOWED_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'strong',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'br',
]);

const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'ul',
  'ol',
  'li',
]);

const INLINE_TAGS = new Set(['strong', 'em', 'u', 'a', 'img', 'br']);

const ALLOWED_ATTRS = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
};

const DEFAULT_BLOCK = 'p';

const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const MEDIA_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);

export const INLINE_COMMAND_TAGS = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
};

export function isAllowedTag(tag) {
  return ALLOWED_TAGS.has(tag.toLowerCase());
}

export function isBlock(tag) {
  return BLOCK_TAGS.has(tag.toLowerCase());
}

export function isInline(tag) {
  return INLINE_TAGS.has(tag.toLowerCase());
}

export function getDefaultBlockTag() {
  return DEFAULT_BLOCK;
}

export function getInlineTag(command) {
  return INLINE_COMMAND_TAGS[command];
}

export function isSafeUrl(value, allowedProtocols = LINK_PROTOCOLS) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = [...trimmed]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127 && !/\s/.test(char);
    })
    .join('')
    .toLowerCase();
  if (
    normalized.startsWith('javascript:')
    || normalized.startsWith('data:')
    || normalized.startsWith('vbscript:')
  ) {
    return false;
  }

  if (trimmed.startsWith('//')) {
    return false;
  }

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return true;
  }

  try {
    return allowedProtocols.has(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

export function isSafeHref(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return isSafeUrl(value, LINK_PROTOCOLS);
}

function sanitizeUrlAttribute(element, name, allowedProtocols) {
  const value = element.getAttribute(name);
  if (value === null) {
    return;
  }

  if (!isSafeUrl(value, allowedProtocols)) {
    element.removeAttribute(name);
  }
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = /** @type {Element} */ (node);
  const tag = element.tagName.toLowerCase();

  if (!isAllowedTag(tag)) {
    const parent = element.parentNode;
    if (!parent) {
      return;
    }

    if (tag === 'script' || tag === 'style') {
      parent.removeChild(element);
      return;
    }

    /** @type {ChildNode[]} */
    const moved = [];
    while (element.firstChild) {
      moved.push(element.firstChild);
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);

    for (const child of moved) {
      sanitizeNode(child);
    }
    return;
  }

  const allowedAttrs = ALLOWED_ATTRS[tag];
  for (const attr of [...element.attributes]) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on') || !allowedAttrs?.has(name)) {
      element.removeAttribute(attr.name);
    }
  }

  if (tag === 'a') {
    sanitizeUrlAttribute(element, 'href', LINK_PROTOCOLS);
    if (element.getAttribute('target') === '_blank') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
  }

  if (tag === 'img') {
    sanitizeUrlAttribute(element, 'src', MEDIA_PROTOCOLS);
  }

  for (const child of [...element.childNodes]) {
    sanitizeNode(child);
  }

  if (tag === 'ul' || tag === 'ol') {
    const parent = element.parentElement;
    if (parent) {
      const parentTag = parent.tagName.toLowerCase();
      if (parentTag === 'ul' || parentTag === 'ol') {
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        return;
      }
    }

    if (element.children.length === 0) {
      element.remove();
    }
  }
}

export function filterHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;

  for (const child of [...template.content.childNodes]) {
    sanitizeNode(child);
  }

  return template.innerHTML;
}
