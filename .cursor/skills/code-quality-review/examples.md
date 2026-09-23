# Reference Examples — Full Reviews (pt-BR output)

Full examples of the mandatory output format defined in SKILL.md. Use these as calibration for tone, depth, and justification style.

---

## Example 1 — ✅ Aprovar

**Change:** A 40-line helper doing a direct date-format conversion was added to the payment service, with two callers in the same file.

```markdown
## Veredito

✅ Aprovar

---

## Resumo Executivo

A mudança extrai a conversão de formato de data duplicada em dois pontos do mesmo arquivo para um helper único e direto, sem camadas adicionais. O fluxo continua linear: quem lê o caller vê a chamada e o corpo do helper no mesmo arquivo. Complexidade do sistema permanece neutra e a duplicação real foi removida sem custo de legibilidade.

---

## Impacto na Complexidade

- Complexidade: Neutra — nenhuma nova camada, interface ou indireção; o helper vive no mesmo módulo dos chamadores.
- Carga cognitiva: Reduziu — a regra de formatação agora existe em um único lugar, em vez de duas cópias que podiam divergir.
- Facilidade de debug: Neutra — a pilha de chamadas continua com um único salto entre caller e lógica.

---

## Problemas identificados

### Alta prioridade

Nenhum.

### Média prioridade

Nenhum.

### Baixa prioridade

- O nome `formatarDataPagamento` é bom, mas a assinatura aceita `Date | string` sem validar a string antes do parse. Vale um comentário ou assert no futuro.

---

## Recomendações

- Nenhuma mudança bloqueante. Opcionalmente, documente no helper que strings de entrada devem vir apenas dos callers atuais.

---

## Conflitos de Princípios

Houve conflito leve entre DRY e Simplicity: a duplicação era pequena (duas ocorrências). A extração venceu porque **não** adicionou indireção — a deduplicação foi feita no mesmo nível de abstração, então Legibility e Maintainability foram preservadas. Pela hierarquia de prioridades, a decisão correta.
```

---

## Example 2 — ⚠️ Aprovar com ressalvas

**Change:** To support "future payment methods", the diff introduces a `PaymentProcessorFactory`, a `PaymentProcessor` interface with a single implementation (`PixProcessor`), and a mapper layer between the DTO and the existing service — for a flow that today only supports Pix.

```markdown
## Veredito

⚠️ Aprovar com ressalvas

---

## Resumo Executivo

O código continua correto e o comportamento de Pix não mudou, então é mergeável. Porém, a mudança adiciona três indireções (Factory → Interface → Mapper) para sustentar um único método de pagamento que já funciona diretamente. Isso aumenta a complexidade estrutural do fluxo de pagamento sem benefício demonstrado hoje. Aprovado com ressalvas porque o custo é absorvível, mas o padrão tende a se multiplicar se copiado em outros fluxos.

---

## Impacto na Complexidade

- Complexidade: Aumentou — três novos artefatos (Factory, interface, mapper) para uma regra que cabia em uma chamada de método direta.
- Carga cognitiva: Aumentou — um desenvolvedor novo precisa abrir 4 arquivos para entender o que antes se via em 1: o mapeamento DTO → service → processador.
- Facilidade de debug: Piorou — um erro de pagamento agora atravessa a Factory e o Mapper antes de chegar ao `PixProcessor`, com logs fragmentados entre camadas.

---

## Problemas identificados

### Alta prioridade

Nenhum.

### Média prioridade

- `PaymentProcessorFactory` retorna um único tipo concreto: é uma abstração prematura (interface com uma implementação e nenhum consumidor adicional).
- O `PaymentMapper` não valida nem transforma nada relevante — apenas repassa campos.

### Baixa prioridade

- Nomenclatura genérica (`Processor`, `Mapper`) dificulta saber o que cada camada faz sem abrir o arquivo.

---

## Recomendações

- Remover a Factory e chamar `PixProcessor` diretamente. Quando (e se) um segundo método de pagamento realmente existir, a abstração será introduzida em um diff pequeno e barato.
- Eliminar o `PaymentMapper` ou dar a ele responsabilidade real (validação de campos obrigatórios, por exemplo).

---

## Conflitos de Princípios

O conflito central é Future extensibility vs. Simplicity. Pela hierarquia de prioridades, Simplicity (4º) vence Future extensibility (8º), e extensibilidade só é aceita com ≥2 consumidores reais — aqui há um. O trade-off foi aceito (mergeável) porque o custo atual é contido, mas a decisão correta seria não introduzir o padrão agora.
```

---

## Example 3 — ❌ Rejeitar

**Change:** To "remove duplication", the diff unifies three order-status flows (web, app, batch) behind a generic `StatusHandler<T, C>` with type parameters, a registry of handlers resolved by reflection, and a shared configuration object with 9 optional fields — consumed differently by each flow.

```markdown
## Veredito

❌ Rejeitar

---

## Resumo Executivo

A mudança elimina duplicação de código de atualização de status, mas ao custo de um handler genérico resolvido por reflexão e de um objeto de configuração com 9 campos opcionais cujo comportamento muda conforme o fluxo. A lógica que era visível em cada fluxo passa a ser distribuída entre genéricos, registro e configuração — tornando o comportamento por fluxo impossível de prever lendo o código. A correção está preservada, mas o aumento de complexidade não tem retorno proporcional, e há risco real de quebrar os fluxos em silêncio via configuração.

---

## Impacto na Complexidade

- Complexidade: Aumentou — três fluxos diretos viraram um genérico + registro por reflexão + configuração compartilhada; o caminho de execução depende de dados em runtime.
- Carga cognitiva: Aumentou — entender um fluxo exige saber quais campos de configuração cada caller preenche; o comportamento não está mais no código que o chama.
- Facilidade de debug: Piorou — stack traces passam por resolução reflexiva, e o comportamento divergente por fluxo é invisível no ponto de chamada.

---

## Problemas identificados

### Alta prioridade

- Resolução de handlers por reflexão: quebra navegação do IDE, dificulta busca de usos e introduz falha em runtime para erros que antes seriam pego em compile time.
- Configuração com 9 campos opcionais consumidos de forma diferente por fluxo: risco de combinação silenciosamente inválida.

### Média prioridade

- Genérico `StatusHandler<T, C>` usado com tipos concretos diferentes em cada fluxo — a abstração não modela uma regra não-trivial real, apenas uniformiza assinaturas.

### Baixa prioridade

- Testes existentes continuam passando, mas não cobrem as combinações de configuração novas.

---

## Recomendações

- Reverter a unificação e manter os três fluxos explícitos. Se houver trecho genuinamente idêntico (ex.: persistência do evento de status), extrair apenas esse trecho como função comum — sem genéricos nem registro.
- Se o objetivo era reduzir bugs de divergência entre fluxos, prefira testes de contrato comparando os três fluxos, não uma abstração forçada.

---

## Conflitos de Princípios

Conflito resolvido pela hierarquia: DRY (6º) e Reuse (7º) perderam para Maintainability (3º) e Simplicity (4º). A duplicação original era de três fluxos **parecidos, não idênticos** — forçá-los em uma abstração única trocou duplicação visível por complexidade acidental e comportamento dependente de configuração. Rejeitado.
```

---

## Calibration notes

- **Tamanho:** cada exemplo tem ~30–45 linhas. Reviews reais podem ser mais longas, mas o Resumo Executivo deve caber em 3–4 frases.
- **Justificativa:** toda linha de impacto e todo problema citam evidência concreta do diff — nunca avaliação genérica.
- **Nenhum:** as seções de prioridade sem problemas recebem `Nenhum.` — nunca são omitidas.
- **Trade-offs:** a seção "Conflitos de Princípios" sempre referencia explicitamente a hierarquia de prioridades do SKILL.md.