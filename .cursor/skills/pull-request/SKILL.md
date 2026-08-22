---
name: pull-request
description: >-
  Gera e atualiza Pull Requests no GitHub a partir do contexto do chat e do diff.
  Usa template padronizado (Tipo, Descrição, O que foi feito, Como testar, Evidências).
  Retorna o link da PR na resposta ao usuário após criar ou atualizar.
  Use quando o usuário pede "Crie a PR", "Atualize a PR", criar/atualizar PR, ou open/update PR.
---

# Pull Request — Nexus

Automatiza criação e atualização de PRs via `gh`, com body em `/tmp/nexus-pr-body.md`. Idioma: **português**.

**Não** commitar automaticamente. Push só neste fluxo (sem `--force`). **Não** alterar `git config`.

## Triggers

| Comando | Ação |
|---------|------|
| **Crie a PR** | Gera body, push se necessário, `gh pr create` |
| **Atualize a PR** | Regenera body (preserva Evidências), push se ahead, `gh pr edit` |

Equivalentes: criar/atualizar PR, open/update PR.

## Saída ao usuário (obrigatória)

Após **Crie a PR** ou **Atualize a PR** com sucesso, a resposta no chat **sempre** inclui o link da PR como URL clicável — nunca omitir.

Formato mínimo:

```markdown
PR criada: https://github.com/org/repo/pull/42
```

ou

```markdown
PR atualizada: https://github.com/org/repo/pull/42
```

Obter a URL:

- **Criar**: `gh pr create ...` (stdout já traz a URL) ou `gh pr view --json url -q .url` após criar
- **Atualizar**: `gh pr view --json url,number,title -q .url` (já coletado no preflight)

Se há aviso de uncommitted, incluir o link **antes** ou **depois** do aviso — o link é obrigatório em qualquer caso.

Em falhas de preflight (gh não autenticado, sem alterações), não há link — usar mensagens de [examples.md](examples.md).

- Body template: [template.md](template.md)
- Exemplos e mensagens preflight: [examples.md](examples.md)
- Preservar Evidências no update: [scripts/merge-evidencias.sh](scripts/merge-evidencias.sh)

## Validações prévias (obrigatórias)

Executar **antes** de gerar body, push ou `gh pr create/edit`. **Sempre informar o usuário** — nunca prosseguir silenciosamente.

### 1. GitHub CLI autenticado

```bash
gh auth status
```

Se falha ou não autenticado → **parar** e usar mensagem em [examples.md](examples.md#gh-não-autenticado). Não chamar `gh pr create`/`edit`.

### 2. Alterações não comitadas

Após `git status`, se há staged/unstaged/untracked:

- **Sempre avisar** (listar arquivos ou resumo)
- Esclarecer: **não entram** no body nem no push
- **Não commitar**
- Sugerir commit + repetir comando, ou stash/descartar

**Crie a PR** com commits à frente da base: pode continuar com commits existentes; aviso obrigatório.

**Atualize a PR**: mesmo critério.

### 3. Sem alterações para a operação

| Situação | Ação |
|----------|------|
| **Crie** — zero commits à frente da base, working tree limpo | Parar. Mensagem [sem alterações — criar](examples.md#sem-alterações-criar-pr) |
| **Crie** — zero commits à frente da base + uncommitted | Parar. Informar **ambos** |
| **Atualize** — PR existe, branch não ahead do remoto | Parar. Mensagem [sem alterações — atualizar](examples.md#sem-alterações-atualizar-pr) |
| **Atualize** — sem PR na branch | Parar. Orientar **"Crie a PR"** |

Base branch: `main` ou `master` (detectar com `git symbolic-ref refs/remotes/origin/HEAD` ou default do repo via `gh repo view --json defaultBranchRef`).

## Crie a PR

1. Ler este skill + [template.md](template.md)
2. Preflight: `gh auth status`; `git status`; `git log <base>...HEAD`; `git diff <base>...HEAD`
3. `gh` não autenticado → parar
4. Sem commits à frente da base → parar (avisar uncommitted se houver)
5. Uncommitted → avisar; body usa **só commits** (não incluir uncommitted)
6. Preencher seções (chat + diff dos commits) — ver [Regras de preenchimento](#regras-de-preenchimento)
7. Gravar `/tmp/nexus-pr-body.md`
8. `git push -u origin HEAD` se necessário (`required_permissions: ["all"]` ou `network` + `git_write`)
9. `gh pr create --title "..." --body-file /tmp/nexus-pr-body.md`
10. **Retornar link da PR** na resposta (`gh pr view --json url -q .url` se create não imprimiu URL); repetir aviso de uncommitted se ainda existir

Título: conciso, em português ou padrão do repo; reflete o escopo principal.

## Atualize a PR

1. Preflight: `gh auth status`; `git status`
2. `gh` não autenticado → parar
3. `gh pr view --json body,url,title` (branch atual); sem PR → orientar **"Crie a PR"**; parar
4. Branch não ahead do remoto (`git status -sb` / `git log origin/<branch>..HEAD`) → parar; nada a atualizar
5. Uncommitted → avisar; body reflete só commits na branch
6. Gerar body novo (seções exceto Evidências) em `/tmp/nexus-pr-body-new.md`
7. Mesclar Evidências do body atual:

```bash
cat /tmp/nexus-pr-body-new.md | bash .cursor/skills/pull-request/scripts/merge-evidencias.sh "$(gh pr view --json body -q .body)" > /tmp/nexus-pr-body.md
```

8. Push se ahead; `gh pr edit --body-file /tmp/nexus-pr-body.md`
9. Título: mudar só se escopo mudou claramente; **Evidências nunca muda**
10. **Retornar link da PR** na resposta (`gh pr view --json url -q .url`); repetir aviso uncommitted se aplicável

## Regras de preenchimento

Seguir [template.md](template.md). Heurísticas para **Tipo da alteração** (`- [x]` só nos aplicáveis):

| Sinal no diff/contexto | Tipo |
|------------------------|------|
| `*.test.js` novos/alterados | Testes |
| `.github/`, workflows CI | CI/CD |
| `package.json`, lockfile | Dependências |
| `.md`, docs | Documentação |
| só CSS/HTML visual | Estilo / UI |
| contrato/API pública quebrada | Breaking change |
| reorganização sem mudança de comportamento | Refatoração |
| comportamento incorreto corrigido | Correção de bug |
| comportamento novo para o usuário | Nova funcionalidade |
| nenhum claro | Outro (+ mencionar na Descrição) |

- **Descrição**: 2–4 frases; priorizar chat; complementar com commits
- **O que foi feito**: bullets concretos; sem dump de diff
- **Como testar**: passos reproduzíveis (UI, comandos, o que observar)
- **Evidências**: criação → literal `Não se aplica`; atualização → valor existente na PR (via script)

## Coleta git (paralelo quando possível)

```bash
git status
git branch --show-current
git log <base>...HEAD --oneline
git diff <base>...HEAD
git status -sb
```

Para update: `gh pr view --json body,url,title,number` e `git log origin/<branch>..HEAD --oneline`.

## Additional resources

- Body de exemplo e mensagens preflight: [examples.md](examples.md)
