# ADR-003: Contrato de plugin

**Status:** Aceito  
**Data:** 2026-08-22

## Contexto

O Nexus é extensível via plugins modulares (formatação, listas, links, mídia, paste, modo código). É necessário um contrato estável para registro, ativação e teardown sem acoplamento ao core.

## Decisão

Cada plugin implementa o contrato:

```javascript
{
  name: string,
  init(editor: NexusEditor): void,
  commands: Record<string, (editor, ...args) => void>,
  shortcuts: Record<string, string>,  // ex.: 'Ctrl+B': 'bold'
  destroy(): void
}
```

Registro via plugin bus (`use(plugin)`), com `enable`/`disable` e teardown em `destroy()`. Implementação do bus na Fase 1; nesta fase apenas o contrato é documentado.

## Consequências

**Positivas**

- Plugins são autocontidos: comandos, atalhos e lifecycle num único objeto.
- `destroy()` garante remoção de listeners e estado ao desabilitar.
- `commands` mapeia diretamente para `editor.execCommand(name)`.

**Negativas**

- Plugins não compartilham estado tipado; comunicação via event bus quando necessário.
- Ordem de `init` entre plugins pode importar; documentar dependências explícitas.

**Neutras**

- Sem sistema de hooks genérico (before/after); event bus cobre extensibilidade ad-hoc.
