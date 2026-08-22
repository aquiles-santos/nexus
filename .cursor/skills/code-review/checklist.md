# Code Review Checklist

Use in formal mode. Each item maps to project rules.

## HTML & Accessibility
- [ ] Semantic elements (`<button>`, `<nav>`, `<main>`) — not `<div onclick>` — `frontend-vanilla`
- [ ] Forms: `<label>` associated, correct `type`, `required`, `autocomplete` — `frontend-vanilla`
- [ ] ARIA only when native semantics are insufficient — `frontend-vanilla`
- [ ] Keyboard navigable; native `<button>` / `<a href>` — `frontend-vanilla`
- [ ] Visible `:focus-visible` styles — `frontend-vanilla`
- [ ] Dynamic updates announced via `aria-live` when needed — `frontend-vanilla`
- [ ] Error messages linked with `aria-describedby` — `frontend-vanilla`
- [ ] Progressive enhancement: core flow works without JS — `frontend-vanilla`

## Modules & DOM
- [ ] ES modules; one responsibility per file — `core-principles`
- [ ] Entrypoints: `export function initX` or `export function createX` — `core-principles`, `frontend-vanilla`
- [ ] `init(root)` returns teardown when listeners attached — `frontend-vanilla`
- [ ] `create(...)` returns `{ element, destroy }` — `frontend-vanilla`
- [ ] Selectors use `data-*`, not styling classes — `core-principles`, `frontend-vanilla`
- [ ] Event delegation on stable parents — `frontend-vanilla`
- [ ] Listeners removed on teardown — `frontend-vanilla`
- [ ] No state on `window` — `frontend-vanilla`
- [ ] DOM reads/writes batched; `DocumentFragment` for bulk inserts — `frontend-vanilla`

## State
- [ ] Local state in module closure — `frontend-vanilla`
- [ ] Cross-module: Custom Events or pub/sub — `frontend-vanilla`
- [ ] Shareable UI state via URL params/hash — `frontend-vanilla`
- [ ] No tokens in `localStorage`; only non-sensitive data in `sessionStorage` — `frontend-vanilla`, `security-fullstack`

## Data Fetching
- [ ] `fetch` checks `response.ok` — `frontend-vanilla`
- [ ] `AbortController` for cancellable requests — `frontend-vanilla`
- [ ] Response shape validated before use — `frontend-vanilla`
- [ ] Loading, error, and empty states in UI — `frontend-vanilla`
- [ ] No empty `catch` blocks — `frontend-vanilla`
- [ ] Client validation is UX; server validates with schema — `frontend-vanilla`, `security-fullstack`

## CSS
- [ ] Co-located `.css` files — `frontend-vanilla`
- [ ] CSS custom properties for tokens — `frontend-vanilla`
- [ ] Mobile-first media queries — `frontend-vanilla`
- [ ] No inline styles except computed values — `frontend-vanilla`

## Security
- [ ] No secrets, `.env`, or tokens in code — `security-fullstack`
- [ ] `textContent` preferred; DOMPurify if `innerHTML` required — `security-fullstack`
- [ ] No `eval()` or `new Function()` — `security-fullstack`
- [ ] Session tokens in `httpOnly` `Secure` `SameSite` cookies — `security-fullstack`
- [ ] CSRF: hidden token in forms; custom header on `fetch` mutations — `security-fullstack`
- [ ] CSP via headers or meta tag — `security-fullstack`
- [ ] `target="_blank"` has `rel="noopener noreferrer"` — `security-fullstack`
- [ ] No sensitive data in logs — `security-fullstack`
- [ ] Parameterized queries / ORM on server — `security-fullstack`
- [ ] No new dependencies without approval — `security-fullstack`

## Tests
- [ ] New `features/` module has co-located `*.test.js` — `core-principles`, `frontend-vanilla`
- [ ] Happy path and at least one validation or network error — `frontend-vanilla`
- [ ] Tests describe behavior, not implementation — `testing-standards`
- [ ] Test names describe behavior (`it('shows an error when...')`) — `testing-standards`
- [ ] Playwright uses `getByRole` / `getByLabelText` — `testing-standards`
- [ ] E2E for critical flows when applicable — `testing-standards`

## Diffs & Style
- [ ] Minimal, focused diff — `core-principles`
- [ ] Complete implementation; no placeholders in new code — `core-principles`
- [ ] Early returns; happy path last — `core-principles`
- [ ] Naming: kebab-case files, `handle*` events, `is/has/can` booleans — `core-principles`
- [ ] No TODOs in new code delivered — `core-principles`

## Project Structure
- [ ] Features under `features/<name>/` with co-located assets — `frontend-vanilla`
- [ ] Shared fetch in `shared/api/` — `frontend-vanilla`
- [ ] Entry point in `assets/scripts/` — `frontend-vanilla`
