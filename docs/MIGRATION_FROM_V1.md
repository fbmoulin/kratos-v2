# Migração de Arquivos - KRATOS v1 → v2

**Data**: 14 de Fevereiro de 2026
**Status**: Análise comparativa completa

---

## Arquivos Importantes no Diretório Antigo

Localização: `C:\projetos-2026\kratos\Plano de Execução para Projeto com Brainstorm e Reasoning\`

### ✅ Já Incorporados no v2

| Arquivo Original | Local no v2 | Status |
|------------------|-------------|--------|
| `Arquitetura do Sistema KRATOS v2.md` | `docs/ARCHITECTURE.md` | ✅ Migrado |
| `Roadmap de Desenvolvimento — KRATOS v2.md` | `docs/ROADMAP.md` | ✅ Migrado |
| `Política de Segurança — KRATOS v2.md` | `docs/SECURITY.md` | ✅ Migrado |
| `Guia de Deploy — KRATOS v2.md` | `docs/DEPLOY.md` | ✅ Migrado |
| `Guia de Variáveis de Ambiente — KRATOS v2.md` | `docs/ENV.md` | ✅ Migrado |
| `Changelog - KRATOS v2.md` | `docs/CHANGELOG.md` | ✅ Migrado |
| `KRATOS v2 - Lista de Tarefas (To-Do).md` | `docs/TODO.md` | ✅ Migrado |
| `docker-compose.yml` | `docker-compose.yml` (raiz) | ✅ Migrado |
| `turbo.json` | `turbo.json` (raiz) | ✅ Migrado |
| `pnpm-workspace.yaml` | `pnpm-workspace.yaml` (raiz) | ✅ Migrado |
| `.env.example` | `.env.example` (raiz) | ✅ Migrado |
| `.gitignore` | `.gitignore` (raiz) | ✅ Migrado |
| `.prettierrc` | `.prettierrc` (raiz) | ✅ Migrado |
| `extract_pdf.py` | `workers/pdf-worker/src/tasks/extract_pdf.py` | ✅ Migrado |
| `celery_app.py` | `workers/pdf-worker/src/celery_app.py` | ✅ Migrado |
| Diagramas `.mmd` e `.png` | `docs/diagrams/` | ✅ Migrados |
| GitHub Actions workflows | `.github/workflows/` | ✅ Migrados |

### 📋 Documentos de Planejamento Importantes (Recomendados para Incorporação)

| Arquivo | Descrição | Ação Recomendada |
|---------|-----------|------------------|
| **`BRAINSTORM & REASONING CRÍTICO — Projeto KRATOS.md`** | Análise técnica profunda com identificação de riscos arquiteturais críticos (TiDB vs Supabase, fine-tuning Claude, Kestra vs LangGraph). **Contém insights valiosos sobre decisões técnicas**. | 🟡 **ALTO VALOR** - Adicionar como `docs/TECHNICAL_ANALYSIS.md` |
| **`nextlevelplan.md`** | Plano de execução completo e detalhado com cronograma de 12-16 semanas, divisão em 5 fases, tabelas de tarefas estruturadas. Mais completo que ROADMAP.md atual. | 🟡 **ALTO VALOR** - Revisar e mesclar insights adicionais no `docs/ROADMAP.md` |
| **`KRATOS v2 - Relatório de Execução da Fase 0.md`** | Relatório de conclusão da Fase 0 com todos os componentes implementados, tabelas de status, informações do Supabase. **Documento histórico importante**. | 🟢 **MÉDIO VALOR** - Adicionar como `docs/PHASE_0_REPORT.md` |
| **`KRATOS_Execution_Plan_v2.md`** | Outro plano de execução detalhado. Pode ter informações complementares ao nextlevelplan.md. | 🔵 **BAIXO VALOR** - Revisar para evitar duplicação |
| **`Achados da Pesquisa - Projeto KRATOS.md`** | Resultados de pesquisa sobre tecnologias, benchmarks, comparações. | 🔵 **BAIXO VALOR** - Arquivar ou mesclar insights em docs técnicos |
| **`1. Introdução.md`** | Documento introdutório do projeto. | 🔵 **BAIXO VALOR** - Conteúdo provavelmente já em README.md |
| **`Pasted_content.txt`** e **`Pasted_content_01.txt`** | Conteúdo colado, possivelmente rascunhos. | ❌ **SEM VALOR** - Ignorar |

### 🔧 Arquivos de Código e Configuração

| Arquivo | Status | Observação |
|---------|--------|------------|
| `drizzle.config.ts` | ✅ Deve existir em `packages/db/` | Verificar se está configurado |
| `rate-limit.ts`, `auth.ts`, `health.ts`, `documents.ts` | ✅ Devem estar em `apps/api/src/routes/` ou `middleware/` | Verificar implementação |
| `index.ts`, `App.tsx`, `main.tsx` | ✅ Devem estar em `apps/api/src/` e `apps/web/src/` | Verificar estrutura |
| `vite.config.ts`, `tsconfig.json` | ✅ Devem existir nos respectivos workspaces | Verificar configuração |
| `init_project.sh`, `run_ci.sh` | 🟡 Scripts de automação úteis | Considerar adicionar em `scripts/` na raiz |
| `requirements.txt` | ✅ Deve estar em `workers/pdf-worker/` | Verificar dependências Python |

### 🎨 Arquivos Visuais e Diagramas

| Arquivo | Status no v2 |
|---------|--------------|
| `ai_agents_flow.mmd` e `.png` | ✅ `docs/diagrams/ai_agents_flow.*` |
| `architecture.mmd` e `.png` | ✅ `docs/diagrams/architecture.*` |
| `cicd_pipeline.mmd` e `.png` | ✅ `docs/diagrams/cicd_pipeline.*` |
| `database_schema.mmd` e `.png` | ✅ `docs/diagrams/database_schema.*` |
| `pdf_pipeline.mmd` e `.png` | ✅ `docs/diagrams/pdf_pipeline.*` |

### 📦 Arquivos Específicos do Contexto Anterior

| Arquivo | Ação |
|---------|------|
| `SKILL.md` (skill de análise de repositório) | ❌ Específico para outra skill - não incorporar |
| `Dockerfile` | ✅ Verificar se existe em `apps/api/` ou raiz |
| `kratos-supabase-info.md` | 🔵 Informações do Supabase já devem estar em `.env.example` |
| `generate_kratos_docs.csv` | ❌ Arquivo de geração, não necessário no repo |

---

## Ações Recomendadas

### Prioridade Alta 🔴

1. **Incorporar Análise Técnica Crítica**
   ```bash
   cp "C:\projetos-2026\kratos\Plano de Execução para Projeto com Brainstorm e Reasoning\BRAINSTORM & REASONING CRÍTICO — Projeto KRATOS.md" \
      docs/TECHNICAL_ANALYSIS.md
   ```
   - Este documento contém análise profunda sobre decisões arquiteturais
   - Identifica riscos como incompatibilidade TiDB/pgvector
   - Questiona escolhas como Kestra vs LangGraph
   - Recomenda Docling para extração de PDF

2. **Mesclar Plano de Execução Detalhado**
   - Revisar `nextlevelplan.md` e identificar gaps no `docs/ROADMAP.md` atual
   - Adicionar tabelas de cronograma detalhadas
   - Incluir estimativas de duração por tarefa

### Prioridade Média 🟡

3. **Adicionar Relatório Histórico da Fase 0**
   ```bash
   cp "C:\projetos-2026\kratos\Plano de Execução para Projeto com Brainstorm e Reasoning\KRATOS v2 - Relatório de Execução da Fase 0.md" \
      docs/PHASE_0_REPORT.md
   ```

4. **Verificar Scripts de Automação**
   - Revisar `init_project.sh` e `run_ci.sh`
   - Se úteis, adicionar em `scripts/` na raiz do monorepo

### Prioridade Baixa 🔵

5. **Revisar Arquivos de Planejamento Duplicados**
   - Comparar `KRATOS_Execution_Plan_v2.md` com `nextlevelplan.md`
   - Arquivar ou deletar duplicatas

6. **Validar Configurações**
   - Verificar se `drizzle.config.ts` está em `packages/db/`
   - Confirmar que todos os middlewares (`rate-limit.ts`, `auth.ts`) estão implementados
   - Validar `Dockerfile` se necessário para deploy

---

## Checklist de Validação

- [x] `docs/TECHNICAL_ANALYSIS.md` adicionado com análise crítica ✅ **CONCLUÍDO**
- [x] `docs/EXECUTION_PLAN.md` adicionado com plano de execução completo ✅ **CONCLUÍDO**
- [x] `docs/PHASE_0_REPORT.md` adicionado como documento histórico ✅ **CONCLUÍDO**
- [ ] Scripts de automação revisados e adicionados se úteis
- [x] Todas as configurações do v1 validadas no v2 ✅ **VALIDADO**
- [x] Diagramas confirmados em `docs/diagrams/` ✅ **VALIDADO**
- [ ] Diretório antigo arquivado ou removido após validação completa

---

## Conclusão

O projeto **KRATOS v2** já possui a maioria dos arquivos essenciais do v1. Os documentos de planejamento e análise crítica no diretório antigo contêm insights valiosos que devem ser incorporados para enriquecer a documentação técnica e o roadmap do projeto.

**Próximos passos**: Executar as ações de Prioridade Alta para garantir que todo o conhecimento crítico está preservado no v2.
