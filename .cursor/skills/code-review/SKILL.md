---
name: code-review
description: >-
  Reviews code for quality, security, accessibility, architecture, and adherence
  to Nexus project rules (.cursor/rules/). Use when the user asks for code review,
  revisar, revisão, PR review, qualidade de código, or adherence to project rules.
  Invoke via /code-review or natural language.
---

# Code Review — Nexus

Review code against project rules in `.cursor/rules/`. This skill does **not** replace `/review-bugbot` or `/review-security` — only invoke those if the user explicitly asks.

## Modes

**Formal** — triggered by `/code-review`, "revisar este diff", "code review", or explicit review requests.
- Produce the full report template below (in Portuguese).
- Do not fix findings until the user asks.

**Inline** — during implementation/refactoring when this skill is in context.
- Apply rules silently; surface only 1–3 highest-risk items.
- Do not dump a full report.

## Workflow

1. **Scope** — default: branch changes + uncommitted (committed, staged, unstaged). Otherwise: files, PR, or path the user cited.
2. **Load rules** — read active rules:
   - `core-principles.mdc`
   - `frontend-vanilla.mdc` (when HTML/CSS/JS in scope)
   - `security-fullstack.mdc`
   - `testing-standards.mdc` (when tests in scope)
3. **Checklist** — in formal mode, walk [checklist.md](checklist.md).
4. **Review order** — correctness → security → accessibility → architecture/coupling → tests → rule consistency. Performance only with evidence (rules forbid premature optimization).
5. **Severity**
   - **Bloqueante** — bugs, XSS/secrets/tokens in storage, accessibility that blocks use, contract breaks (`innerHTML` with untrusted data, `eval`, concatenated SQL)
   - **Importante** — coupling, module without `init`/`create`, fetch without `response.ok`/`AbortController`, critical feature without test, partial a11y gaps
   - **Recomendação** — clarity, extraction, CSS tokens; never style nitpicks outside rules (quotes, semicolons)
6. **Do not nitpick** — pending CSS methodology, optimization without profiling, code outside the diff, backend rules when no backend exists.

## Report template (formal mode — Portuguese)

```markdown
# Code Review — [scope]

## Resumo
[2–4 sentences: what changed and the main risk]

## Achados
### Bloqueante
- `file:line` — problem. Why (rule). How to fix.

### Importante
- ...

### Recomendações
1. ...

## Riscos
- Coupling / testability / maintainability / security

## Veredicto
Aprovar | Aprovar com ressalvas | Pedir mudanças
```

## Additional resources

- Checklist mapped to rules: [checklist.md](checklist.md)
- Good vs bad review comments: [examples.md](examples.md)
