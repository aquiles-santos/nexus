# ADR-002: DOM vivo + AST só na serialização

**Status:** Aceito  
**Data:** 2026-08-22

## Contexto

Editores WYSIWYG podem manter um modelo de dados separado do DOM (ex.: ProseMirror doc, Slate value) ou usar o DOM como fonte da verdade. O Nexus precisa exportar HTML5 semântico e JSON AST para consumo via API.

## Decisão

O **DOM vivo** (`contenteditable` + manipulação via Range API) é a **única fonte da verdade** durante a edição. A AST JSON é **gerada sob demanda** na serialização:

```javascript
editor.getContent({ format: 'html' })  // innerHTML sanitizado
editor.getContent({ format: 'ast' })   // árvore JSON derivada do DOM
```

Não há modelo intermediário sincronizado com o DOM em tempo real.

## Consequências

**Positivas**

- Simplicidade: um único estado (o DOM); sem listeners bidirecionais DOM ↔ modelo.
- O HTML exportado reflete exatamente o que o usuário editou.
- Alinhado a JavaScript puro sem dependências de runtime.

**Negativas**

- Transformações complexas (normalização de nós, merge de blocos) exigem manipulação DOM cuidadosa.
- A AST é derivada, não editável diretamente; round-trip AST → DOM fica fora do MVP.

**Neutras**

- Undo/redo (Fase 1) usa snapshots HTML + seleção, não diff de AST.
