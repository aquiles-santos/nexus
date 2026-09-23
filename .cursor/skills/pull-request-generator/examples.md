# Pull Request — Exemplos

## Body de PR gerado (fictício)

Contexto: validação de e-mail no login. Diff: `features/auth/login-form.js` + `login-form.test.js`.

```markdown
## Tipo da alteração

- [x] Nova funcionalidade
- [ ] Correção de bug
- [ ] Refatoração
- [ ] Documentação
- [x] Testes
- [ ] CI/CD
- [ ] Dependências
- [ ] Estilo / UI
- [ ] Breaking change
- [ ] Outro

## Descrição

O formulário de login aceitava qualquer string no campo de e-mail. Esta PR valida o formato antes do envio e exibe erro acessível quando o valor é inválido.

## O que foi feito

- Validação de e-mail em `features/auth/login-form.js` antes do `fetch`
- Mensagem de erro associada ao campo via `aria-describedby`
- Testes em `features/auth/login-form.test.js` para vazio, inválido e válido

## Como testar

1. Abrir a página de login
2. Submeter com e-mail `usuario` — deve aparecer o erro e não chamar a API
3. Submeter com e-mail válido — o envio deve ocorrer
4. Rodar `npm test -- features/auth/login-form.test.js`

## Evidências

Não se aplica
```

No update, se o autor alterou Evidências (ex.: link de captura), o script `merge-evidencias.sh` preserva esse valor; as outras seções são regeneradas.

---

## Saída de sucesso (exemplos)

**Crie a PR** — com uncommitted:

```markdown
PR criada: https://github.com/org/repo/pull/42

**Aviso:** há alterações locais não comitadas (`features/auth/login-form.js`) que não entraram nesta PR. Faça commit e envie **"Atualize a PR"** para incluir.
```

**Atualize a PR:**

```markdown
PR atualizada: https://github.com/org/repo/pull/42
```

O link deve ser a URL completa `https://github.com/...` — não apenas o número da PR.

---

## Mensagens preflight

Adaptar nomes de arquivos, branch e base. **Sempre** usar quando a condição se aplica.

### gh não autenticado

O GitHub CLI (`gh`) não está autenticado. Para criar ou atualizar PRs, autentique-se:

1. Execute: `gh auth login`
2. Selecione **GitHub.com**
3. Escolha **HTTPS** (ou SSH, se já usa chave configurada)
4. Siga o fluxo no navegador ou com código de dispositivo
5. Confirme com: `gh auth status`

Depois disso, envie novamente **"Crie a PR"** ou **"Atualize a PR"**.

### Alterações não comitadas

Há alterações locais que **não foram commitadas** e **não entram** nesta PR nem no push:

- `features/auth/login-form.js` (modificado)
- `features/auth/login-form.test.js` (não rastreado)

A descrição da PR reflete apenas o que já está commitado na branch. Para incluir essas mudanças, faça commit e envie o comando novamente — ou use `git stash` / descarte se não devem fazer parte da PR.

### Sem alterações — criar PR

Não há commits na branch `feat/login-validation` em relação a `main`. Não é possível abrir uma PR sem alterações commitadas.

Implemente e faça commit na branch, depois envie **"Crie a PR"** novamente.

**Com uncommitted também:**

Além disso, há mudanças locais não comitadas (listadas acima). A PR não foi criada.

### Sem alterações — atualizar PR

A branch `feat/login-validation` já está sincronizada com o remoto e a PR #42 já reflete o estado atual. Não há commits novos para atualizar a descrição.

Faça novos commits e push, ou edite Evidências diretamente no GitHub se só precisa de capturas.

### Sem PR para atualizar

Não existe PR aberta para a branch `feat/login-validation`. Use **"Crie a PR"** para criar uma nova.