# KRATOS v2 - Lista de Tarefas (To-Do)

Esta lista de tarefas detalha as ações necessárias para a implementação do MVP do KRATOS v2, organizada por fases conforme o roadmap do projeto.

---

## Fase 0: Fundação, Segurança e CI/CD ✅ CONCLUÍDA

- [x] **Infraestrutura e Monorepo**
  - [x] Inicializar repositório Git.
  - [x] Configurar `pnpm workspaces` e `Turborepo`.
  - [x] Estruturar diretórios: `apps/`, `packages/`, `workers/`.
  - [x] Configurar ESLint, Prettier e TypeScript para o monorepo.
  - [x] Criar arquivo `docker-compose.yml` para serviços locais (Redis).

- [x] **Banco de Dados (Supabase/PostgreSQL)**
  - [x] Criar projeto no Supabase (`jzgdorcvfxlahffqnyor`, sa-east-1).
  - [x] Definir schema Drizzle com 8 tabelas (`documents`, `extractions`, `analyses`, `precedents`, `graph_entities`, `graph_relations`, `prompt_versions`, `audit_logs`).
  - [x] Habilitar a extensão `pgvector` via Supabase migration.
  - [x] Aplicar schema via MCP migration (8 tabelas + indexes).
  - [ ] Implementar triggers SQL para a tabela `audit_logs`.
  - [ ] Criar índice HNSW para busca vetorial em produção.

- [x] **Segurança e CI/CD**
  - [x] Documentar todas as variáveis de ambiente no `docs/ENV.md`.
  - [x] Criar workflow no GitHub Actions para CI (lint, test).
  - [ ] Configurar segredos no ambiente de staging.
  - [ ] Criar workflow de CD para staging.

---

## Fase 1: Motor de Ingestão e Extração de PDF ✅ CONCLUÍDA (scaffold)

- [x] **Processamento Assíncrono**
  - [x] Configurar Celery (worker Python) e Redis (broker).
  - [x] Criar endpoint na API para upload de PDF e enfileiramento do job.
  - [ ] Implementar notificação de status no frontend (polling ou WebSocket).

- [x] **Pipeline de Extração** (scaffold — implementação parcial)
  - [x] Desenvolver o worker Python scaffold (`workers/pdf-worker/`).
  - [x] Criar Dockerfile para o worker.
  - [x] Adicionar worker ao docker-compose (`profiles: [worker]`).
  - [ ] Integrar Docling para extração estrutural de texto.
  - [ ] Integrar pdfplumber para extração de tabelas.
  - [ ] Integrar Gemini 2.5 Flash API para OCR.
  - [ ] Implementar schemas de validação com Pydantic.

- [ ] **Caching**
  - [ ] Implementar caching dos resultados da extração no Redis.
  - [ ] Definir TTLs e estratégia de invalidação de cache.

---

## Fase 2: Orquestração de Agentes e Lógica de IA ✅ CONCLUÍDA

- [x] **Grafo de Agentes (LangGraph)**
  - [x] Modelar o grafo de decisão: supervisor → router → rag → specialist → drafter → complete.
  - [x] Implementar agente Supervisor de Complexidade.
  - [x] Implementar agente Roteador de Matéria (Gemini Flash).
  - [x] Implementar agentes Especialistas (FIRAC+ Enterprise v3.0, 7-phase CoT).
  - [x] Implementar agente Drafter (domain prompt registry: GENERICO/BANCARIO/CONSUMIDOR).
  - [x] Model router: 7-factor complexity scoring, 5-tier model selection.

- [x] **RAG (Retrieval-Augmented Generation)**
  - [x] Implementar vector-search via pgvector (cosine similarity).
  - [x] Implementar graph-search (knowledge graph traversal).
  - [x] Implementar hybrid-search (RRF fusion).
  - [x] Criar seed script para indexar 100 precedentes STJ com embeddings (`pnpm seed`).
  - [x] Integrar injeção dinâmica de few-shots nos prompts.

- [x] **Testes AI** — 70 testes passando (15 suites)
  - [x] Prompts: drafter (12), firac-enterprise (13), templates (6)
  - [x] Graph: workflow (1), supervisor (6), router (3), specialist (2), drafter (4)
  - [x] RAG: embeddings (2), vector-search (2), hybrid-search (4), graph-search (2)
  - [x] Router: model-router (8)
  - [x] Providers: anthropic + google (3)
  - [x] State: AgentState (2)

- [ ] **Observabilidade de IA**
  - [ ] Integrar LangSmith em todos os nós do LangGraph.
  - [ ] Persistir Chain-of-Thought no banco de dados.

---

## Fase 2.5: E2E Wiring ✅ CONCLUÍDA (2026-02-15)

- [x] **Database**
  - [x] pgvector extension enabled.
  - [x] 8 tabelas aplicadas via Supabase MCP migration.
  - [x] `.env` criado com todas as keys (Supabase, OpenAI, Anthropic, Gemini).

- [x] **RAG Seed**
  - [x] Script `seed-precedents.ts` busca STJ Dados Abertos (CKAN API).
  - [x] 100 acordãos de 4 turmas (1ª-4ª) com embeddings 1536d.
  - [x] Inserção via Supabase REST API (contorna IPv6/WSL2).

- [x] **E2E Scripts**
  - [x] `test-e2e-full.ts` — upload PDF → poll extraction → analyze → validate.
  - [x] `test-e2e-pipeline.ts` atualizado com RAG Stage 1.5.
  - [x] Auth bypass dev em `auth.ts` (NODE_ENV + TEST_USER_ID).
  - [x] Scripts `seed` e `e2e` adicionados ao root package.json.

- [x] **Docker**
  - [x] `pdf-worker` adicionado ao docker-compose (`profiles: [worker]`).

---

## Fase 3: Frontend, HITL e Geração de Documentos 🔜 PRÓXIMA

- [ ] **Interface de Usuário**
  - [ ] Desenvolver o componente de upload de arquivos.
  - [ ] Construir o dashboard principal com visualização de status.
  - [ ] Implementar skeleton loaders para feedback visual.

- [ ] **Human-in-the-Loop (HITL)**
  - [ ] Criar tela de revisão com painel de raciocínio da IA.
  - [ ] Implementar editor de texto para minuta com diff-viewer.
  - [ ] Desenvolver ações de "Aprovar", "Revisar" e "Rejeitar".

- [ ] **Geração de Documentos**
  - [ ] Criar templates `.docx` para diferentes tipos de minuta.
  - [ ] Desenvolver endpoint para gerar documento com docxtpl.
  - [ ] Integrar botão de download no frontend.

---

## Fase 4: Testes, Monitoramento e Deploy

- [ ] **Testes**
  - [ ] Testes de integração para fluxos críticos (Playwright).
  - [ ] Testes para @kratos/web, @kratos/db, @kratos/tools.
  - [ ] Cobertura de testes no CI.

- [ ] **Monitoramento**
  - [ ] Integrar Sentry no frontend e backend.
  - [ ] Configurar Prometheus/Grafana para métricas.
  - [ ] Definir alertas para cenários críticos.

- [ ] **Deploy**
  - [ ] Configurar projetos de produção (Vercel/Fly.io).
  - [ ] Workflow de deploy com aprovação manual.
  - [ ] Teste de carga inicial.

---

## Pós-MVP (Enterprise)

- [ ] Índice HNSW para precedents.embedding (produção).
- [ ] Audit log triggers SQL automáticos.
- [ ] Migração para TiDB se necessário.
- [ ] Infisical para gestão de segredos.
- [ ] Integração com APIs de tribunais.
- [ ] Fine-tuning de modelos open-source.
- [ ] Arquitetura multi-tenancy.
- [ ] RLS policies no Supabase.
