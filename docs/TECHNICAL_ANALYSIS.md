# BRAINSTORM & REASONING CRÍTICO — Projeto KRATOS

## 1. ANÁLISE DE COERÊNCIA ARQUITETURAL

### 1.1 Conflito TiDB vs Supabase (pgvector)
**PROBLEMA CRÍTICO**: O documento menciona "pgvector no TiDB" e "Few-Shot Template Engine: Busca no TiDB (via pgvector)". Isso é tecnicamente incorreto. pgvector é uma extensão exclusiva do PostgreSQL, e TiDB é MySQL-compatible, não PostgreSQL. TiDB possui seu próprio mecanismo de vector search nativo (TiDB Vector Search), que é diferente do pgvector.

**REASONING**: Existem duas abordagens possíveis:
- (A) Usar TiDB Vector Search nativo para RAG semântico, eliminando a dependência do Supabase para buscas vetoriais.
- (B) Manter Supabase com pgvector exclusivamente para RAG e TiDB para dados transacionais/analíticos.

**RECOMENDAÇÃO**: Opção (A) é preferível para simplificar a arquitetura. TiDB 8.5+ suporta vector search nativo, eliminando a necessidade de dois bancos de dados para a mesma finalidade. Supabase pode ser mantido exclusivamente para autenticação.

### 1.2 Dois Bancos de Dados = Complexidade Desnecessária?
**REASONING**: Manter TiDB + Supabase (PostgreSQL) cria:
- Dois ORMs ou drivers diferentes (MySQL protocol vs PostgreSQL)
- Duas estratégias de backup/recovery
- Dois pontos de falha
- Complexidade operacional dobrada

**ALTERNATIVA**: Considerar PostgreSQL puro (via Supabase ou Neon) com pgvector para MVP, migrando para TiDB apenas quando a escala justificar. Para um sistema jurídico brasileiro, o volume inicial não justifica distributed SQL.

### 1.3 Kestra como Orquestrador
**REASONING**: Kestra é YAML-declarativo e excelente para data pipelines, mas o KRATOS é fundamentalmente um sistema de agentes IA, não um pipeline de dados. O LangGraph já faz orquestração de agentes. Usar Kestra + LangGraph cria sobreposição funcional.

**ALTERNATIVA**:
- LangGraph para orquestração de agentes (já planejado)
- BullMQ (Node.js) ou Celery (Python) para filas de processamento assíncrono de PDFs
- Kestra apenas se houver necessidade real de workflows visuais complexos inter-sistemas

## 2. ANÁLISE DE STACK TECNOLÓGICA

### 2.1 Processamento de PDF
**ESTADO DA ARTE (2025/2026)**:
- **Docling (IBM)**: 97.9% accuracy em tabelas complexas, open-source, melhor que Unstructured
- **Gemini 2.5 Flash**: Capacidade nativa de processar PDFs via vision API, excelente para OCR e extração
- **marker-pdf**: Bom para conversão MD, mas Docling é superior em accuracy

**RECOMENDAÇÃO**: Substituir marker-pdf por Docling como extrator primário. Usar Gemini 2.5 Flash (não 2.0 como no doc original) para vision/OCR de imagens e como fallback. Manter pdfplumber para tabelas simples (é leve e rápido).

### 2.2 Modelos de IA
**PROBLEMA**: O documento menciona "fine-tuning leve em Claude para domínios jurídicos brasileiros". Claude (Anthropic) NÃO oferece fine-tuning público. O fine-tuning é limitado a parceiros enterprise selecionados.

**ALTERNATIVAS VIÁVEIS**:
- Few-shot prompting com exemplos jurídicos (já planejado, é o caminho correto)
- Fine-tuning de modelos open-source (Qwen, Llama) para tarefas específicas
- Prompt engineering avançado com Claude Sonnet 4 / Opus 4

**RECOMENDAÇÃO**: Abandonar a ideia de fine-tuning em Claude. Focar em:
1. RAG robusto com precedentes jurídicos
2. Few-shot prompting dinâmico
3. Structured outputs com Zod/Pydantic
4. Gemini 2.5 Flash para reasoning (conforme preferência do usuário)

### 2.3 Modelo de Roteamento (Supervisor de Complexidade)
**REASONING**: O conceito de rotear entre Claude Haiku (simples) e Opus/Sonnet (complexo) é sólido, mas os nomes dos modelos estão desatualizados. Em 2025/2026:
- Claude Haiku 3.5 → para tarefas simples
- Claude Sonnet 4 → para tarefas médias
- Claude Opus 4 → para tarefas complexas
- Gemini 2.5 Flash → excelente custo-benefício para reasoning

**RECOMENDAÇÃO**: Usar OpenRouter para roteamento automático multi-modelo, com fallback entre provedores.

### 2.4 SecretOps (Infisical)
**VALIDAÇÃO**: Infisical é uma escolha sólida e validada pela comunidade. Alternativas como HashiCorp Vault são mais complexas. Para o escopo do KRATOS, Infisical é adequado.

**ATENÇÃO**: Para MVP, variáveis de ambiente gerenciadas pelo provedor de deploy (Vercel, Fly.io) podem ser suficientes. Infisical adiciona valor real quando há múltiplos ambientes e equipes.

## 3. ANÁLISE DE RISCOS

### 3.1 Riscos Técnicos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Incompatibilidade TiDB/Supabase | Alta | Alto | Unificar em um único banco |
| Fine-tuning Claude indisponível | Certa | Médio | Usar RAG + few-shot |
| Performance PDF >100 páginas | Média | Alto | Chunking + Docling + cache |
| Hallucination em minutas jurídicas | Alta | Crítico | HITL obrigatório + validação Zod |
| Custo de APIs de IA descontrolado | Média | Alto | Budget caps + roteamento inteligente |
| Complexidade do monorepo | Média | Médio | Começar simples, escalar depois |

### 3.2 Riscos de Negócio
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Não-compliance com Res. 615/2025 CNJ | Baixa | Crítico | Auditoria imutável desde Fase 0 |
| Rejeição por advogados (UX complexa) | Média | Alto | Testes de usabilidade, UI simples |
| Custo operacional alto para escritórios pequenos | Média | Alto | Tier gratuito/freemium |

### 3.3 Riscos de Prazo
**REASONING**: A estimativa de 29-36 dias úteis (8-12 semanas) para MVP é otimista considerando:
- Integração de 8+ serviços externos
- Pipeline de IA com múltiplos modelos
- Compliance regulatório
- Frontend com design avançado (Glassmorphism)

**ESTIMATIVA REALISTA**: 12-16 semanas para MVP funcional com equipe de 2-3 pessoas.

## 4. OPORTUNIDADES DE OTIMIZAÇÃO

### 4.1 Simplificação da Arquitetura (MVP-First)
- **Fase 0**: PostgreSQL (Supabase) como único banco + pgvector para RAG
- **Pós-MVP**: Avaliar migração para TiDB se escala justificar
- **Resultado**: Reduz complexidade em ~40%, acelera time-to-market

### 4.2 Docling como Motor Principal de Extração
- Substituir marker-pdf + Unstructured por Docling (IBM)
- Manter pdfplumber como complemento para tabelas
- Gemini 2.5 Flash para vision/OCR de imagens

### 4.3 Observabilidade Unificada
- **OpenTelemetry** como padrão de instrumentação (em vez de Sentry + Prometheus separados)
- LangSmith para tracing de IA (já planejado)
- Grafana Cloud (free tier) para dashboards unificados

### 4.4 Deploy Simplificado
- **Frontend**: Vercel (excelente para React, free tier generoso)
- **Backend API**: Railway ou Fly.io (mais simples que K8s para MVP)
- **Workers Python**: Fly.io Machines (scale-to-zero)
- **Evitar Kubernetes** até que a escala justifique

### 4.5 Gemini 2.5 Flash como Modelo Principal de Reasoning
- Conforme preferência do usuário, usar Gemini 2.5 Flash para reasoning
- Claude Sonnet 4 como fallback para tarefas que exigem outputs mais longos
- OpenRouter para roteamento automático

## 5. GAPS IDENTIFICADOS NO DOCUMENTO ORIGINAL

1. **Ausência de estratégia de backup/disaster recovery** detalhada
2. **Sem menção a rate limiting** para APIs de IA (essencial para controle de custos)
3. **Sem estratégia de versionamento** de prompts e templates
4. **Sem plano de migração de dados** caso mude de banco
5. **Sem menção a LGPD** (dados jurídicos são sensíveis)
6. **Sem estratégia de cache invalidation** (apenas menção a "caching em Redis")
7. **Sem plano de rollback** em caso de falha de deploy
8. **Sem definição de SLA** para processamento de documentos
9. **Sem estratégia de feature flags** para rollout gradual
10. **Sem plano de onboarding** de usuários (advogados)

---

**Documento criado**: 14 de Fevereiro de 2026
**Fonte**: Análise crítica do planejamento inicial do KRATOS v2
**Status**: ✅ Decisões arquiteturais validadas e aplicadas no projeto atual
