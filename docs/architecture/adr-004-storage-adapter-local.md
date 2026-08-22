# ADR-004: StorageAdapter local

**Status:** Aceito  
**Data:** 2026-08-22

## Contexto

O plugin de mídia (Fase 2) precisa persistir imagens inseridas no editor. Integrações com S3, Cloudinary ou backend próprio ficam pós-v1. O MVP deve funcionar offline no localhost.

## Decisão

Definir a interface `StorageAdapter` e implementar um adapter **local** no MVP:

```javascript
/**
 * @typedef {Object} StorageAdapter
 * @property {(file: File) => Promise<string>} upload  — retorna URL utilizável (<img src>)
 * @property {(url: string) => Promise<void>} [remove] — opcional no MVP
 */
```

Implementação local: `URL.createObjectURL(file)` / `FileReader` para gerar `blob:` URLs. Sem upload remoto até v1.0.0.

## Consequências

**Positivas**

- Demo e testes locais funcionam sem credenciais ou backend.
- Interface estável permite trocar adapter (S3, Cloudinary) pós-v1 sem mudar o plugin de mídia.
- Alinhado ao escopo localhost do roadmap.

**Negativas**

- URLs `blob:` não persistem entre sessões; aceitável para MVP e demo.
- Imagens grandes consomem memória do browser; limite de tamanho documentado na Fase 2.

**Neutras**

- Adapter remoto é plugável; contrato não muda.
