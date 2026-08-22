# ADR-001: `contenteditable` no light DOM vs iframe

**Status:** Aceito  
**Data:** 2026-08-22

## Contexto

O Nexus precisa renderizar conteúdo editável cujo HTML publicado seja idêntico ao que o usuário vê no editor. A interface (toolbar, modais, tooltips) deve ser encapsulada para não conflitar com estilos da página hospedeira.

Duas abordagens principais foram consideradas:

1. **Iframe** — isolamento total do conteúdo editável.
2. **Light DOM** — `contenteditable` diretamente no DOM da página, com chrome em Shadow DOM.

## Decisão

Usar **`contenteditable` no light DOM** para a área editável. A chrome (toolbar, modal, tooltip) fica em **Shadow DOM** com CSS Parts e custom properties para customização.

```
nexus-editor (host)
├── shadow root
│   └── nexus-toolbar, nexus-modal, nexus-tooltip
└── light DOM
    └── div[contenteditable]  ← conteúdo publicável
```

## Consequências

**Positivas**

- O HTML gerado por `getContent()` é o mesmo DOM renderizado — sem serialização iframe → parent.
- Estilos do host podem afetar o conteúdo editável quando desejado (ex.: tipografia do CMS).
- Selection API e Range operam no documento principal, sem `contentWindow` cross-frame.

**Negativas**

- Estilos globais do host podem vazar para o conteúdo editável; mitigação via reset mínimo no host.
- Shadow DOM não encapsula o conteúdo editável; a sanitização na saída (Fase 2) é obrigatória.

**Neutras**

- Iframe descartado por complexidade de Selection API cross-frame e diferença entre DOM interno e HTML exportado.
