# Achados da Pesquisa - Projeto KRATOS

**Data**: Pesquisa realizada durante planejamento inicial (Janeiro-Fevereiro 2026)
**Objetivo**: Validar decisões tecnológicas e identificar riscos arquiteturais

---

## 1. TiDB Cloud
- Reconhecido como líder no G2 Spring/Summer 2025
- Atlassian migrou centenas de clusters Postgres para 16 clusters TiDB (3M+ tabelas)
- TiDB Cloud Starter: free tier com limitações; Essential: a partir de $500/mês
- TiDB suporta vector search nativo (alternativa ao pgvector)
- MySQL-compatible wire protocol, não PostgreSQL
- **RISCO**: Incompatibilidade entre TiDB (MySQL-like) e Supabase (PostgreSQL) - o projeto menciona usar pgvector no TiDB mas pgvector é extensão PostgreSQL
- TiDB tem seu próprio vector index nativo, não precisa de pgvector

**Decisão Final**: PostgreSQL (Supabase) com pgvector para MVP. TiDB considerado apenas para escala futura.

---

## 2. Kestra Workflow Orchestration
- Kestra 1.1 (Nov 2025): Human-in-the-loop, dashboards no-code
- Alternativas: Temporal (mais maduro para microservices), Prefect (mais Python-native)
- Kestra é YAML-declarativo, bom para workflows visuais
- Comunidade menor que Airflow/Prefect

**Decisão Final**: LangGraph para orquestração de agentes + Celery para filas assíncronas. Kestra descartado (sobreposição funcional).

---

## 3. Infisical Secrets Management
- Bem avaliado em produção (Reddit r/devops)
- Open-source com opção self-hosted
- Alternativas: Doppler, HashiCorp Vault, AWS Secrets Manager
- Boa integração com CI/CD

**Decisão Final**: Variáveis de ambiente nativas do provedor de deploy para MVP. Infisical planejado para fase enterprise.

---

## 4. PDF Extraction (Benchmark 2025)
- **Docling (IBM)**: Melhor accuracy geral (97.9% em tabelas complexas), bom para enterprise
- **Unstructured**: Forte OCR, mas lento (51-141s), 100% em tabelas simples, 75% em complexas
- **LlamaParse**: Mais rápido (~6s), mas problemas com multi-coluna
- **marker-pdf**: Mencionado no projeto, bom para conversão MD
- **pdfplumber**: Excelente para tabelas, leve e rápido
- **Gemini 2.5 Flash**: Pode fazer OCR direto de PDFs com vision, boa alternativa

**Decisão Final**: Pipeline híbrido Docling (primário) + pdfplumber (tabelas) + Gemini 2.5 Flash (imagens/OCR).

---

## 5. LangGraph / LangSmith
- LangGraph: Framework low-level para multi-agent, sem prompts escondidos
- LangSmith: Tracing e observabilidade para LangChain/LangGraph
- Bem estabelecido no ecossistema LangChain

**Decisão Final**: Adotado. LangGraph para grafo de agentes, LangSmith para tracing completo.

---

## 6. Deploy (Fly.io vs Railway vs Render)
- Fly.io: Bom para edge computing, mais complexo
- Railway: Mais simples, bom DX, Functions serverless
- Render: Bom custo-benefício, mais limitado em scaling
- Todos mais caros que VPS direta para workloads constantes

**Decisão Final**: Vercel (frontend) + Railway ou Fly.io (backend/workers). Evitar Kubernetes para MVP.

---

## 7. Frontend
- React 19 + Tailwind 4 + shadcn/ui: Stack moderna e estável
- Glassmorphism: Existem libs prontas (shadcn-glass-ui)
- OKLCH: Suportado nativamente no Tailwind 4

**Decisão Final**: Stack adotada conforme pesquisa. Glassmorphism aplicado com moderação.

---

## 8. Resolução 615/2025 CNJ
- Marco regulatório para IA no Judiciário
- Exige transparência, auditabilidade, supervisão humana
- Chain-of-Thought logging é requisito de compliance

**Decisão Final**: Auditoria imutável via triggers SQL + HITL obrigatório + LangSmith tracing como conformidade.

---

## Conclusões da Pesquisa

### Riscos Identificados e Mitigados
1. ✅ **TiDB/pgvector incompatibilidade** → Unificado em PostgreSQL (Supabase)
2. ✅ **Kestra redundância** → Descartado em favor de LangGraph
3. ✅ **Complexidade de deploy** → Evitado Kubernetes para MVP

### Decisões Validadas
1. ✅ **Docling** como extrator primário de PDF
2. ✅ **LangGraph** para orquestração de agentes
3. ✅ **React 19 + Tailwind 4** para frontend
4. ✅ **Supabase** como plataforma unificada (DB + Auth + Storage)

### Próximas Validações Necessárias
- [ ] Benchmarks reais de performance do pipeline Docling
- [ ] Custo operacional de APIs de IA em produção
- [ ] Escalabilidade do Celery com volume real de PDFs
- [ ] UX testing com advogados reais

---

**Status**: Pesquisa concluída. Decisões incorporadas no TECHNICAL_ANALYSIS.md e ARCHITECTURE.md.
