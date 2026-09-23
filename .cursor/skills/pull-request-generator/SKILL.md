---
name: pull-request-generator
description: >-
  Gera e atualiza Pull Requests no GitHub a partir do contexto do chat e do diff.
  Usa template padronizado (Tipo, Descrição, O que foi feito, Como testar, Evidências).
  Retorna o link da PR na resposta ao usuário após criar ou atualizar.
  Use quando o usuário pede "Crie a PR", "Atualize a PR", criar/atualizar PR, ou open/update PR.
---

# Pull Request

Automatiza criação e atualização de PRs via `gh`, com body em `/tmp/pr-body.md`. Idioma: **português**.

**Não** commitar automaticamente. Push só neste fluxo (sem `--force`). **Não** alterar `git config`.

## Triggers

| Comando           | Ação                                                             |
| ----------------- | ---------------------------------------------------------------- |
| **Crie a PR**     | Gera body, push se necessário, `gh pr create`                    |
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

| Situação                                                     | Ação                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Crie** — zero commits à frente da base, working tree limpo | Parar. Mensagem [sem alterações — criar](examples.md#sem-alterações-criar-pr)         |
| **Crie** — zero commits à frente da base + uncommitted       | Parar. Informar **ambos**                                                             |
| **Atualize** — PR existe, branch não ahead do remoto         | Parar. Mensagem [sem alterações — atualizar](examples.md#sem-alterações-atualizar-pr) |
| **Atualize** — sem PR na branch                              | Parar. Orientar **"Crie a PR"**                                                       |

### 4. Base branch (obrigatória)

`<base>` é a **branch de onde a feature branch foi criada**. A PR deve apontar para essa base — não para o default do repo nem para o upstream local.

Definir `<head>` (branch da PR) e `<base>` **antes** de qualquer coleta git, body ou `gh pr create`.

| Prioridade | Origem de `<base>`                                          |
| ---------- | ----------------------------------------------------------- |
| 1          | Usuário solicitou explicitamente (ex.: "PR para `develop`") |
| 2          | Branch de criação detectada no reflog (abaixo)              |
| 3          | Ambíguo ou indetectável → **perguntar** ao usuário          |

**Detecção** (`<head>` = branch atual da PR):

```bash
git reflog show <head> | grep 'branch: Created from' | tail -1
```

| Reflog                                            | `<base>`                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `branch: Created from <nome>` e `<nome>` ≠ `HEAD` | `<nome>`                                                                                                                                               |
| `branch: Created from HEAD`                       | commit `C` da linha; branch local cujo tip é `C`: `git branch --points-at C --format='%(refname:short)'` (excluir `<head>`)                            |
| Tip movido desde a criação                        | entre branches locais `B` ≠ `<head>`, usar `B` em que `git merge-base B <head>` = `C`; empate → `main`, `develop`, `master`; ainda ambíguo → perguntar |

**Validação:** `git log <base>..<head>` deve ter commits. Se vazio → parar e avisar.

**Regras:**

- **Sempre** passar `--base <base>` em `gh pr create` — nunca omitir nem deixar o `gh` inferir.
- Usar o **mesmo** `<base>` em todo o fluxo: `git log <base>...<head>`, `git diff <base>...<head>`, validação e criação da PR.
- Na resposta ao usuário, informar: `<base>` ← `<head>`.

## Crie a PR

1. Ler este skill + [template.md](template.md)
2. Definir `<head>` (branch da PR) e `<base>` (branch de criação — ver [Base branch](#4-base-branch-obrigatória))
3. Preflight: `gh auth status`; `git status`; `git log <base>...<head>`; `git diff <base>...<head>`
4. `gh` não autenticado → parar
5. Sem commits à frente de `<base>` em `<head>` → parar (avisar uncommitted se houver)
6. Uncommitted → avisar; body usa **só commits** (não incluir uncommitted)
7. Preencher seções (chat + diff dos commits) — ver [Regras de preenchimento](#regras-de-preenchimento)
8. Gravar `/tmp/pr-body.md`
9. `git push -u origin HEAD` se necessário
10. `gh pr create --base <base> --title "..." --body-file /tmp/pr-body.md`
11. **Retornar link da PR** na resposta (`gh pr view --json url -q .url` se create não imprimiu URL); incluir `<base>` ← `<head>`; repetir aviso de uncommitted se ainda existir

Título: conciso, em português ou padrão do repo; reflete o escopo principal.

## Atualize a PR

1. Preflight: `gh auth status`; `git status`
2. `gh` não autenticado → parar
3. `gh pr view --json body,url,title,baseRefName` (branch atual); sem PR → orientar **"Crie a PR"**; parar
4. Usar `baseRefName` da PR existente como `<base>` para `git log <base>...HEAD` e `git diff <base>...HEAD`
5. Branch não ahead do remoto (`git status -sb` / `git log origin/<branch>..HEAD`) → parar; nada a atualizar
6. Uncommitted → avisar; body reflete só commits na branch
7. Gerar body novo (seções exceto Evidências) em `/tmp/pr-body-new.md`
8. Mesclar Evidências do body atual (script dentro da pasta do skill):

```bash
cat /tmp/pr-body-new.md | bash scripts/merge-evidencias.sh "$(gh pr view --json body -q .body)" > /tmp/pr-body.md
```

9. Push se ahead; `gh pr edit --body-file /tmp/pr-body.md`
10. Título: mudar só se escopo mudou claramente; **Evidências nunca muda**
11. **Retornar link da PR** na resposta (`gh pr view --json url -q .url`); incluir `<base>` ← branch atual; repetir aviso uncommitted se aplicável

## Regras de preenchimento

Seguir [template.md](template.md). Heurísticas para **Tipo da alteração** (`- [x]` só nos aplicáveis):

| Sinal no diff/contexto                     | Tipo                             |
| ------------------------------------------ | -------------------------------- |
| `*.test.js` novos/alterados                | Testes                           |
| `.github/`, workflows CI                   | CI/CD                            |
| `package.json`, lockfile                   | Dependências                     |
| `.md`, docs                                | Documentação                     |
| só CSS/HTML visual                         | Estilo / UI                      |
| contrato/API pública quebrada              | Breaking change                  |
| reorganização sem mudança de comportamento | Refatoração                      |
| comportamento incorreto corrigido          | Correção de bug                  |
| comportamento novo para o usuário          | Nova funcionalidade              |
| nenhum claro                               | Outro (+ mencionar na Descrição) |

- **Descrição**: 2–4 frases; priorizar chat; complementar com commits
- **O que foi feito**: bullets concretos; sem dump de diff
- **Como testar**: passos reproduzíveis (UI, comandos, o que observar)
- **Evidências**: criação → literal `Não se aplica`; atualização → valor existente na PR (via script)

## Coleta git (paralelo quando possível)

Definir `<head>` e `<base>` antes de coletar (ver [Base branch](#4-base-branch-obrigatória)).

```bash
git status
git branch --show-current   # → <head>
git log <base>...<head> --oneline
git diff <base>...<head>
git status -sb
```

Para update: `gh pr view --json body,url,title,number,baseRefName` e `git log origin/<branch>..HEAD --oneline`.

## Additional resources

- Body de exemplo e mensagens preflight: [examples.md](examples.md)
