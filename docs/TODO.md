# KRATOS v2 - Lista de Tarefas (To-Do)

Esta lista de tarefas detalha as ações necessárias para a implementação do MVP do KRATOS v2, organizada por fases conforme o roadmap do projeto.

---

## Fase 0: Fundação, Segurança e CI/CD

- [ ] **Infraestrutura e Monorepo**
  - [ ] Inicializar repositório Git.
  - [ ] Configurar `pnpm workspaces` e `Turborepo`.
  - [ ] Estruturar diretórios: `apps/`, `packages/`, `workers/`.
  - [ ] Configurar ESLint, Prettier e TypeScript para o monorepo.
  - [ ] Criar arquivo `docker-compose.yml` para serviços locais (Redis).

- [ ] **Banco de Dados (Supabase/PostgreSQL)**
  - [ ] Criar projeto no Supabase.
  - [ ] Definir e aplicar o schema SQL inicial (tabelas `users`, `documents`, `extractions`, `analyses`, `audit_logs`, `precedents`, `prompt_versions`).
  - [ ] Implementar triggers SQL para a tabela `audit_logs`.
  - [ ] Habilitar a extensão `pgvector` e criar índice HNSW.

- [ ] **Segurança e CI/CD**
  - [ ] Documentar todas as variáveis de ambiente necessárias no `docs/ENV.md`.
  - [ ] Configurar segredos no ambiente de staging (Vercel/Fly.io).
  - [ ] Criar workflow no GitHub Actions para CI (lint, test) em Pull Requests.
  - [ ] Criar workflow no GitHub Actions para CD (deploy) para o ambiente de staging.

---

## Fase 1: Motor de Ingestão e Extração de PDF

- [ ] **Processamento Assíncrono**
  - [ ] Configurar Celery (worker Python) e Redis (broker).
  - [ ] Criar endpoint na API para upload de PDF e enfileiramento do job.
  - [ ] Implementar lógica no frontend para notificação de status (polling ou WebSocket).

- [ ] **Pipeline de Extração**
  - [ ] Desenvolver o worker Python para o pipeline de extração.
  - [ ] Integrar **Docling** para extração estrutural de texto.
  - [ ] Integrar **pdfplumber** para extração de tabelas.
  - [ ] Integrar **Gemini 2.5 Flash API** para análise de imagens (OCR).
  - [ ] Implementar schemas de validação com **Pydantic**.

- [ ] **Caching**
  - [ ] Implementar lógica de caching dos resultados da extração no Redis.
  - [ ] Definir TTLs e estratégia de invalidação de cache.

---

## Fase 2: Orquestração de Agentes e Lógica de IA

- [ ] **Grafo de Agentes**
  - [ ] Modelar o grafo de decisão no **LangGraph**.
  - [ ] Implementar o agente **Supervisor de Complexidade**.
  - [ ] Implementar o agente **Roteador de Matéria**.
  - [ ] Implementar os agentes **Especialistas** (Cível, Penal, etc.).
  - [ ] Integrar validação de output com **Zod/Pydantic** em cada agente.

- [ ] **RAG (Retrieval-Augmented Generation)**
  - [ ] Criar script para indexar precedentes jurídicos no `pgvector`.
  - [ ] Implementar a lógica de busca de similaridade para o few-shot engine.
  - [ ] Integrar a injeção dinâmica de few-shots nos prompts.

- [ ] **Observabilidade de IA**
  - [ ] Integrar **LangSmith** em todos os nós do LangGraph.
  - [ ] Garantir que o Chain-of-Thought seja persistido no banco de dados.

---

## Fase 3: Frontend, HITL e Geração de Documentos

- [ ] **Interface de Usuário**
  - [ ] Desenvolver o componente de upload de arquivos.
  - [ ] Construir o dashboard principal com a visualização de status dos documentos.
  - [ ] Implementar skeleton loaders para feedback visual durante o processamento.

- [ ] **Human-in-the-Loop (HITL)**
  - [ ] Criar a tela de revisão com o painel de raciocínio da IA.
  - [ ] Implementar o editor de texto para a minuta com diff-viewer.
  - [ ] Desenvolver a lógica para as ações de "Aprovar", "Revisar" e "Rejeitar".

- [ ] **Geração de Documentos**
  - [ ] Criar templates `.docx` para os diferentes tipos de minuta.
  - [ ] Desenvolver o endpoint no backend para gerar o documento com **docxtpl**.
  - [ ] Integrar o botão de download no frontend.

---

## Fase 4: Testes, Monitoramento e Deploy

- [ ] **Testes**
  - [ ] Escrever testes unitários para o backend (Pytest).
  - [ ] Escrever testes unitários para o frontend (Vitest/Jest).
  - [ ] Criar testes de integração para os fluxos críticos (Playwright).
  - [ ] Configurar o cálculo de cobertura de testes no CI.

- [ ] **Monitoramento**
  - [ ] Integrar **Sentry** no frontend e backend para error tracking.
  - [ ] Configurar **Prometheus** para coletar métricas de performance.
  - [ ] Criar dashboards no **Grafana** para visualizar as principais métricas.
  - [ ] Definir e implementar alertas para cenários críticos.

- [ ] **Deploy**
  - [ ] Configurar os projetos de produção no Vercel e Fly.io/Railway.
  - [ ] Criar o workflow de deploy para produção no GitHub Actions (com aprovação manual).
  - [ ] Realizar o deploy final para o grupo de usuários beta.
  - [ ] Realizar um teste de carga inicial para garantir que o deploy foi bem sucedido.

---

## Pós-MVP (Enterprise)

- [ ] Avaliar a necessidade de migração para TiDB.
- [ ] Planejar a implementação do Infisical para gestão de segredos.
- [ ] Pesquisar a integração com APIs de tribunais.
- [ ] Iniciar a coleta de dados para fine-tuning de modelos open-source.
- [ ] Desenvolver a arquitetura multi-tenancy.
