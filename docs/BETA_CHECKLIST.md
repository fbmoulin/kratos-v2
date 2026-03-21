# Beta Institucional — Checklist Go/No-Go

**Versão**: 1.0
**Data**: 2026-03-21

Este checklist formaliza os critérios para declarar o KRATOS v2 como **beta institucional**.

---

## Extração (Fase A)

- [x] Trigger.dev é a única pipeline de produção para extração de PDFs
- [x] `workers/pdf-worker/` marcado como ARCHIVED (não usado em runtime)
- [x] `pdf_runner.py` chamado via subprocess pelo Trigger.dev task
- [x] `ExtractionOutputSchema` inclui campos v1.1.0 (fileHash, contentHash, processingTimeMs)
- [x] Migration SQL para colunas de proveniência criada
- [x] Extractions salvam fileHash, contentHash, processingTimeMs no banco

## Deduplicação (Fase B)

- [x] SHA-256 pdfHash calculado em ambas as rotas (/v2/documents e /v2/ingest)
- [x] Dedup simétrica: mesmo comportamento em upload manual e ingestão externa
- [x] `idempotencyKey` enviado ao Trigger.dev para prevenir extração duplicada
- [x] Contratos `DedupeCheckRequest/Response` definidos em `@kratos/core`
- [x] Documentação de dedup atualizada em `docs/integrations/lex-intelligentia.md`

## Governança de Prompts (Fase C)

- [x] Prompt resolver não cai em fallback silencioso em produção/staging
- [x] `resolvePromptWithMetadata()` retorna key, version, hash, source
- [x] Análises registram promptKey, promptVersion, promptHash no banco
- [x] Lifecycle de prompts: draft → approved → active → rolled_back
- [x] `contentHash` computado automaticamente ao criar prompt version
- [x] Endpoint `/v2/prompts/:key/validate` para verificação de integridade
- [x] Endpoint `/v2/prompts/:key/activate/:version` com audit log
- [x] Documentação em `docs/prompt-governance.md`
- [x] Contratos `PromptValidationRequest/Response` definidos em `@kratos/core`

## Segurança (Fase D)

- [x] Validação SSRF na rota `/v2/ingest` para URLs de PDF
- [x] Bloqueio de IPs privados (127.x, 10.x, 172.16-31.x, 192.168.x, ::1, etc.)
- [x] HTTPS obrigatório para download de PDFs
- [x] Bloqueio de redirecionamentos (`redirect: 'error'`)
- [x] Validação de Content-Type e Content-Length antes do download
- [x] Timeout de 30s para downloads
- [x] `URL_INGESTION_ALLOWLIST` configurável via .env
- [x] Bloqueio de credenciais embutidas em URLs
- [x] `docs/SECURITY.md` atualizado com seção SSRF
- [x] Testes unitários para url-validator

## Convergência Documental (Fase E)

- [x] ARCHITECTURE.md: LangSmith marcado como implementado (não "planned")
- [x] ARCHITECTURE.md: Redis BRPOP workers marcados como "Development Fallback Only"
- [x] Tracing config inclui campos de proveniência (fileHash, contentHash, promptHash)
- [x] Checklist de liberação formalizado (este documento)
- [x] Changelog atualizado com todas as fases

## Pré-requisitos de Deploy

- [ ] Todas as migrations aplicadas em staging
- [ ] Testes passando em CI (pnpm test com cobertura)
- [ ] Variáveis de ambiente configuradas em staging/production
- [ ] LangSmith tracing habilitado (LANGCHAIN_TRACING_V2=true)
- [ ] URL_INGESTION_ALLOWLIST configurado para produção
- [ ] Prompt versions semeados no banco de produção

---

**Decisão**: Quando todos os itens acima estiverem marcados, o KRATOS v2 pode ser declarado como **beta institucional**.
