# Plano de Projeto: Nexus

**Departamento de Engenharia de Software**

*Desenvolvimento do Nexus: Editor WYSIWYG Moderno e Extensível*

**14 de agosto de 2026**

---

## 1. Objetivo do Projeto

Este projeto visa o desenvolvimento do Nexus, um editor de texto rico (WYSIWYG) de alto desempenho, inspirado na arquitetura do TinyMCE, porém otimizado para ecossistemas modernos de desenvolvimento. O foco central reside na extensibilidade através de uma arquitetura de plugins modular, performance com baixo overhead de carregamento e uma experiência de usuário fluida.

O desenvolvimento será realizado exclusivamente em **JavaScript Puro (Vanilla JS)** com **Módulos ES6 nativos**, garantindo que a renderização do conteúdo no Nexus seja idêntica ao resultado final publicado, sem a dependência de frameworks, compiladores ou transpilers de terceiros.

---

## 2. Escopo Inicial (MVP)

O Produto Mínimo Viável (MVP) contempla as funcionalidades essenciais para operação em sistemas de gestão de conteúdo:

- **Edição Básica:** Implementação de comandos de texto (negrito, itálico, sublinhado) e listas (ordenadas e não ordenadas).
- **Inserção de Mídia:** Suporte para upload de imagens com redimensionamento dinâmico e inserção de hiperlinks.
- **Formatação Estrutural:** Suporte a cabeçalhos (H1 a H3) e blocos de citação (blockquotes).
- **Limpeza de Código:** Algoritmo de sanitização para remover estilos inline e tags proprietárias ao colar conteúdo de fontes externas (Word, Google Docs).
- **Exportação Multiformato:** Capacidade de gerar saída em HTML5 semântico e JSON (AST) para consumo via API.

---

## 3. Levantamento de Requisitos

### 3.1. Requisitos Funcionais (RF)

1. **RF01 — Atalhos de Teclado:** O Nexus deve responder a comandos padrão (`Ctrl+B`, `Ctrl+I`, `Ctrl+K`) para agilidade na edição.
2. **RF02 — Responsividade:** A interface do Nexus e sua toolbar devem se adaptar automaticamente a diferentes resoluções de tela através de CSS Grid e Flexbox.
3. **RF03 — Modo Código:** Disponibilização de uma visão em texto puro para edição direta do código-fonte gerado.

### 3.2. Requisitos Não Funcionais (RNF)

1. **RNF01 — Performance:** O tamanho total do bundle inicial não deve exceder **100 kb (Gzip)**, aproveitando a ausência total de frameworks e bibliotecas externas.
2. **RNF02 — Compatibilidade:** Suporte garantido para as versões estáveis mais recentes do Chrome, Firefox, Safari e Edge.
3. **RNF03 — Acessibilidade:** Conformidade com as diretrizes **WCAG 2.1 nível AA**, incluindo navegação por teclado e suporte a leitores de tela via atributos ARIA nativos.

---

## 4. Definição de Papéis e Responsabilidades

A equipe será estruturada para garantir autonomia e qualidade técnica em todas as frentes:

| Papel | Responsabilidade |
|-------|------------------|
| **Product Owner (PO)** | Gestão do backlog, definição de prioridades de negócio e validação final das entregas. |
| **Tech Lead** | Definição da arquitetura de software baseada em Web Components, escolha de APIs nativas e supervisão da integridade do código, assegurando a pureza do JavaScript. |
| **UI/UX Designer** | Criação do sistema visual no Figma, foco em usabilidade e fluxos de interação. |
| **Desenvolvedores (Frontend/Fullstack)** | Implementação técnica utilizando JavaScript Puro (Vanilla JS) e a IDE Cursor. |
| **QA Engineer** | Planejamento e execução de testes automatizados, garantindo a ausência de regressões. |

---

## 5. Fluxo de Trabalho com Ferramentas

### 5.1. Jira (Gestão Ágil)

Utilização de metodologia Scrum com Sprints quinzenais. O workflow será composto por: **Backlog**, **To Do**, **In Progress**, **Code Review**, **Testing** e **Done**.

**Épicos sugeridos:** Core Engine, Web Components UI, Media Management, Plugin Architecture.

### 5.2. Figma (Design e Handoff)

Criação de um Design System dedicado para o Nexus. O processo inclui prototipagem de alta fidelidade e uso do Dev Mode para extração de tokens diretamente para o CSS custom properties do projeto.

### 5.3. Cursor (Desenvolvimento com IA)

Adoção do Cursor como IDE principal para acelerar o desenvolvimento:

- **Configuração:** Uso de arquivos `.cursorrules` para impor padrões de codificação em Vanilla JS e documentação automática, proibindo o uso de sintaxes de frameworks.
- **IA Composer:** Geração de boilerplate para novos Web Components e refatoração de algoritmos complexos de manipulação de DOM.

### 5.4. Github (Versionamento e CI/CD)

- **Estratégia de Branching:** Uso de GitFlow (`main`, `develop`, `feature/`, `hotfix/`).
- **Pull Requests:** Exigência de aprovação de 2 revisores e passagem obrigatória em todos os checks de CI.
- **CI/CD:** Github Actions configurado para execução de linting, testes e deploy automatizado em ambiente de staging.

---

## 6. Etapas de Implementação

1. **Setup e Arquitetura:** Configuração do ambiente (servidor de desenvolvimento nativo e Módulos ES6) e definição da estrutura de pastas focada em módulos ES6 nativos. O projeto elimina qualquer necessidade de compiladores ou ferramentas de build complexas.

2. **Core Engine (Selection API):** Desenvolvimento da camada de abstração da Selection API e Range API nativas para manipulação precisa de texto, garantindo controle total sobre o cursor e estados de seleção sem bibliotecas externas.

3. **UI com Web Components:** Implementação da interface (Toolbar, Modais, Tooltips) utilizando Custom Elements e Shadow DOM para garantir encapsulamento total de estilos e comportamento.

4. **Plugin System:** Criação do barramento de eventos nativo que permite a ativação/desativação de funcionalidades modulares em JavaScript Puro.

5. **Data Handling:** Implementação dos parsers de entrada (HTML/Markdown) e serializadores de saída.

---

## 7. Testes e Validação

- **Testes Unitários:** Utilização de Jest (ou testes nativos) para validar a lógica de transformação de nós e sanitização de strings, garantindo a integridade do código em JavaScript Puro.
- **Testes E2E:** Implementação de fluxos críticos (ex.: colar texto complexo e verificar saída) via Playwright.
- **Cross-browser:** Validação automatizada em diferentes engines (Chromium, WebKit, Gecko) para garantir consistência visual e funcional da Selection API sem depender de polyfills externos.

---

## 8. Critérios de Aceite

Para que uma funcionalidade seja considerada concluída, deve atender aos seguintes parâmetros:

| Critério | Meta |
|----------|------|
| **Cobertura de Código** | Mínimo de **85%** de cobertura em testes unitários. |
| **Qualidade de Saída** | O HTML gerado deve ser válido pelo validador da W3C e livre de estilos inline. |
| **Performance** | O Largest Contentful Paint (LCP) do Nexus em uma página padrão deve ser inferior a **0,8 s**, otimizado pela ausência total de frameworks e compiladores. |

---

## 9. Riscos e Dependências

| Risco | Mitigação |
|-------|-----------|
| **Inconsistência da Selection API entre navegadores** (especialmente Safari) | Uso de camadas de abstração robustas em JavaScript Puro e testes exaustivos em WebKit. |
| **Encapsulamento com Shadow DOM** | O uso de Shadow DOM pode dificultar a integração de estilos globais de terceiros. Mitigação: uso de CSS Parts e Variables. |
| **Dependência de Storage** | O módulo de mídia depende da integração com APIs de storage (S3/Cloudinary) para persistência de imagens. |

---

## 10. Cronograma Sugerido

| Fase | Duração | Entregável Principal |
|------|---------|----------------------|
| Inception | 1 semana | Documento de Arquitetura e Protótipo Figma |
| Fundação | 3 semanas | Core Engine (Selection API) e Web Components Base |
| Features (MVP) | 4 semanas | Plugins de Mídia e Sanitização de Código |
| Estabilização | 2 semanas | Relatório de QA e Ajustes de Performance |
| Entrega | 1 semana | Release v1.0.0 e Documentação de API |

> **Nota:** O cronograma acima é uma estimativa do documento original. O [roadmap de implementação](./roadmap.md) do repositório prioriza entrega acelerada e validação local (localhost) até o v1.0.0.

---

## Rodapé

**Gestão de Projetos** · **Liderança Técnica**

*Local e data: São Paulo, 14 de agosto de 2026*

Documento elaborado em 14 de agosto de 2026. As informações contidas são de responsabilidade do solicitante.
