# Code Review Examples

Good vs bad review comments for Nexus vanilla stack.

---

## XSS via `innerHTML`

**Bloqueante — good**

`features/comments/comment-list.js:42` — User comment text is inserted via `innerHTML`. Untrusted HTML enables XSS. Rule: `security-fullstack` (prefer `textContent`; DOMPurify only if HTML is required). Fix: use `textContent` or sanitize with DOMPurify before insertion.

**Nitpick — bad**

"Consider using template literals for the HTML string on line 42." — Style preference; misses the security issue.

---

## Module without teardown or test

**Importante — good**

`features/auth/login-form.js` — `initLoginForm` adds a `submit` listener but never returns teardown; dynamic remount will leak listeners. Rule: `frontend-vanilla` (`init` returns teardown when listeners are attached). Also missing co-located `login-form.test.js`. Rule: `core-principles`, `frontend-vanilla`.

**Nitpick — bad**

"Rename `handleSubmit` to `onSubmit`." — Not in project naming rules (`handle*` is required).

---

## Fetch without error handling

**Importante — good**

`features/profile/profile.js:28` — `fetch('/api/profile')` does not check `response.ok`; failed responses are parsed as JSON. Empty `catch` swallows network errors. Rule: `frontend-vanilla` (check `response.ok`, no empty catch, surface errors in UI with `aria-describedby`).

**Nitpick — bad**

"Add `async/await` instead of `.then()`." — Not a rule violation; both are acceptable.

---

## Accessibility

**Bloqueante — good**

`features/search/search.html:15` — Search control is a `<div>` with `click` handler. Not keyboard accessible. Rule: `frontend-vanilla` (use native `<button>` or `<a href>`). Fix: replace with `<button type="button">` or add equivalent keyboard support.

**Recomendação — good**

`features/search/search.css:8` — Focus ring removed with `outline: none` without `:focus-visible` replacement. Rule: `frontend-vanilla`. Fix: restore visible focus for keyboard users.

---

## Security — external link

**Importante — good**

`index.html:34` — `<a href="..." target="_blank">` missing `rel="noopener noreferrer"`. Rule: `security-fullstack`. Fix: add `rel="noopener noreferrer"`.

---

## Veredicto examples

- **Aprovar** — No bloqueantes or importantes; only minor recomendações.
- **Aprovar com ressalvas** — Importantes present but fixable without redesign; no bloqueantes.
- **Pedir mudanças** — Any bloqueante, or multiple importantes affecting security, a11y, or untested critical paths.
