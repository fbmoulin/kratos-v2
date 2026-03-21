# Plano de Execução Delta — KRATOS v2

## Objetivo

Este plano substitui a visão de construção greenfield por um plano de **convergência, hardening e readiness de produção**. O KRATOS v2 já possui monorepo, API, frontend, workers, RAG, testes e pipelines de deploy documentados no README【turn98file0】, mas os documentos operacionais mostram gaps relevantes ainda abertos no TODO e no plano de production hardening【turn96file0】【turn97file0】. Por isso, o foco agora é alinhar runtime, documentação e operação.

## Premissas

1. **Fonte de verdade operacional**: `docs/TODO.md` + `docs/plans/2026-02-16-production-hardening.md`.
2. **Fonte de visão de produto**: `README.md`.
3. **Fontes a reconciliar**: `ARCHITECTURE.md` e `ENV.md`, que ainda refletem parte do desenho anterior com Celery/Fly.io/Supabase Storage como fluxo principal【turn93file0】【turn100file0】.
4. **Lex-Intelligentia** deve ser tratado como **adapter de ingestão** e não como núcleo do produto.

---

## Workstream A — Reconciliation (3 a 5 dias)

### Objetivo
Eliminar drift entre README, arquitetura, env e backlog real.

### Agentes / Skills
- **Agent-Architecture-Editor**: `rewrite_architecture_doc`, `align_runtime_model`
- **Agent-Docs-Governor**: `reconcile_readme`, `mark_implemented_vs_planned`
- **Agent-Env-Refactor**: `rewrite_env_doc`, `remove_legacy_runtime`

### Tasks
1. Reescrever `docs/ARCHITECTURE.md` para refletir runtime atual:
   - Hono 4.7 + Node.js na API;
   - workers `analysis-worker` e `docx-worker`;
   - Redis BRPOP/ioredis;
   - deploy Vercel + Railway【turn98file0】.
2. Reescrever `docs/ENV.md` removendo centralidade de Celery/Fly.io e atualizando variáveis do runtime real【turn100file0】.
3. Atualizar `README.md` com duas seções explícitas:
   - **Implemented**
   - **Planned / Post-MVP**
4. Criar matriz de alinhamento documental:
   - `runtime truth`
   - `ops truth`
   - `product truth`

### Entregável
- Documentação reconciliada e consistente com o estado real do sistema.

---

## Workstream B — Compliance & Production Blockers (5 a 7 dias)

### Objetivo
Fechar lacunas de produção e compliance já identificadas no backlog.

### Agentes / Skills
- **Agent-Compliance**: `implement_audit_triggers`, `review_r615_controls`
- **Agent-DB-Hardening**: `create_hnsw_index`, `apply_rls`, `review_pooling`
- **Agent-SecOps**: `configure_secrets`, `validate_deploy_envs`

### Tasks
1. Implementar triggers SQL automáticas para `audit_logs`【turn96file0】.
2. Criar índice HNSW de produção para `precedents.embedding`【turn96file0】.
3. Implementar ou revisar políticas RLS no Supabase【turn96file0】.
4. Configurar GitHub Secrets pendentes para deploy staging/produção【turn96file0】.
5. Revisar LGPD operacional:
   - retenção de dados;
   - anonimização de logs;
   - documentação de consentimento.

### Entregável
- Checklist de compliance fechado para beta controlado.

---

## Workstream C — PDF Pipeline Truth (7 a 10 dias)

### Objetivo
Transformar a pipeline de PDF descrita no README em pipeline comprovadamente operacional.

### Agentes / Skills
- **Agent-PDF-Core**: `integrate_docling`, `integrate_pdfplumber`, `integrate_gemini`
- **Agent-Schema-Validator**: `define_pydantic_schemas`, `validate_extractions`
- **Agent-Cache-Engineer**: `implement_extraction_cache`, `ttl_policy`
- **Agent-SLA-Tester**: `benchmark_pdf_pipeline`, `measure_processing_sla`

### Tasks
1. Fechar integração real de Docling, pdfplumber e Gemini 2.5 Flash no worker【turn96file0】【turn98file0】.
2. Implementar validação Pydantic nos outputs de extração【turn96file0】.
3. Implementar cache Redis por hash de documento e invalidation policy【turn96file0】.
4. Definir fallback explícito por tipo de PDF:
   - texto simples;
   - tabelas complexas;
   - imagens/OCR.
5. Medir SLA real de extração e registrar baseline.

### Entregável
- Pipeline de PDF validada tecnicamente, com benchmark e schema enforcement.

---

## Workstream D — AI Robustness & Prompt Governance (5 a 7 dias)

### Objetivo
Fechar rastreabilidade, versionamento de prompts e robustez de outputs LLM.

### Agentes / Skills
- **Agent-LangSmith**: `instrument_graph_nodes`, `persist_traces`
- **Agent-Prompt-Governor**: `version_prompts`, `activate_prompt_release`
- **Agent-LLM-Robustness**: `validate_json_output`, `track_cost_latency`

### Tasks
1. Integrar LangSmith em todos os nós do LangGraph【turn96file0】.
2. Persistir CoT e traces relevantes com política de retenção clara【turn96file0】.
3. Tornar `prompt_versions` fonte única de verdade para prompts ativos【turn142172778851863】.
4. Definir workflow de promoção de prompt:
   - draft
   - approved
   - active
   - rollback
5. Instrumentar custo, latência e falhas por modelo.

### Entregável
- Pipeline de IA rastreável, versionada e auditável de ponta a ponta.

---

## Workstream E — Release Readiness (5 a 7 dias)

### Objetivo
Fechar o fluxo crítico upload → extraction → analysis → review → DOCX → audit log.

### Agentes / Skills
- **Agent-E2E**: `write_smoke_tests`, `validate_critical_path`
- **Agent-DOCX**: `finalize_docx_worker`, `test_export_flow`
- **Agent-Frontend-HITL**: `close_review_gaps`, `record_hitl_actions`

### Tasks
1. Confirmar operação real do `docx-worker` e export polling【turn98file0】.
2. Garantir que aprovação/rejeição HITL cai em `audit_logs`.
3. Criar smoke tests E2E do fluxo crítico completo.
4. Validar error boundaries, token refresh e API base URL já corrigidos no hardening【turn97file0】.
5. Executar teste de carga inicial e registrar resultados【turn96file0】.

### Entregável
- Release candidate operacional para grupo beta controlado.

---

## Workstream F — Lex-Intelligentia Adapter (após A–E)

### Objetivo
Integrar `lex-intelligentia` como provedor de ingestão híbrida sem contaminar o core do KRATOS.

### Agentes / Skills
- **Agent-Adapter-Designer**: `define_ingestion_contract`, `map_payloads`
- **Agent-Scraping-Safety**: `secure_scraping_runtime`, `manual-login-session-reuse`
- **Agent-External-Ingestion**: `sync_metadata_to_kratos`, `enqueue_documents`

### Tasks
1. Definir contrato mínimo REST/JSON entre `lex-intelligentia` e `kratos-v2`.
2. Remover segredo real/aparente do README e substituir por placeholders.
3. Tratar `lex-intelligentia` como entrada opcional de:
   - metadados CNJ;
   - scraping controlado;
   - PDFs para ingestão.
4. Não acoplar n8n do Lex ao core do Kratos; usar como adapter externo.
5. Implementar normalização e deduplicação de documentos antes da ingestão no core.

### Entregável
- Adapter de ingestão externa desacoplado e seguro.

---

## Ordem de Execução Recomendada

1. **A — Reconciliation**
2. **B — Compliance & Production Blockers**
3. **C — PDF Pipeline Truth**
4. **D — AI Robustness & Prompt Governance**
5. **E — Release Readiness**
6. **F — Lex-Intelligentia Adapter**

---

## Critérios de Pronto

O plano será considerado concluído quando:

- a documentação refletir o runtime real;
- os blockers de compliance e produção estiverem fechados;
- a pipeline de PDF estiver validada com schema e benchmark;
- a IA estiver rastreada, versionada e com custos monitorados;
- o fluxo crítico completo estiver coberto por smoke tests;
- `lex-intelligentia` estiver integrado por contrato, sem invadir o core do produto.
