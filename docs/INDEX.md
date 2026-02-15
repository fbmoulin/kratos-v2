# Índice de Documentação - KRATOS v2

Guia completo para navegar toda a documentação do projeto.

---

## 🚀 Começando

| Documento | Descrição | Público-alvo |
|-----------|-----------|--------------|
| [README.md](../README.md) | Visão geral do projeto, stack, começando | Todos |
| [CLAUDE.md](../CLAUDE.md) | Guia para Claude Code (IA) | Desenvolvedores + IA |

---

## 📋 Planejamento e Arquitetura

| Documento | Descrição | Tamanho |
|-----------|-----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitetura do sistema completa | 9.1KB |
| [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) | ⭐ Análise crítica de decisões técnicas | 7.9KB |
| [EXECUTION_PLAN.md](EXECUTION_PLAN.md) | ⭐ Plano de execução detalhado (12-16 semanas) | 17KB |
| [ROADMAP.md](ROADMAP.md) | Roadmap de desenvolvimento | 7.3KB |
| [PHASE_0_REPORT.md](PHASE_0_REPORT.md) | ⭐ Relatório histórico da Fase 0 | 4.7KB |

---

## 💻 Desenvolvimento

| Documento | Descrição | Tamanho |
|-----------|-----------|---------|
| [API.md](API.md) | Referência completa da API RESTful | 5.6KB |
| [ENV.md](ENV.md) | Variáveis de ambiente necessárias | 3.8KB |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guia de contribuição | 4.4KB |
| [TODO.md](TODO.md) | Lista de tarefas pendentes | 5.1KB |

---

## 🔒 Segurança e Infraestrutura

| Documento | Descrição | Tamanho |
|-----------|-----------|---------|
| [SECURITY.md](SECURITY.md) | Política de segurança | 7.6KB |
| [DEPLOY.md](DEPLOY.md) | Procedimentos de deploy | 4.7KB |
| [SUPABASE_INFO.md](SUPABASE_INFO.md) | ⭐ Informações do projeto Supabase | 3.2KB |

---

## 🔬 Pesquisa e Decisões Técnicas

| Documento | Descrição | Localização |
|-----------|-----------|-------------|
| [RESEARCH_FINDINGS.md](research/RESEARCH_FINDINGS.md) | ⭐ Achados de pesquisa tecnológica | `docs/research/` |
| [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) | Análise crítica (riscos, gaps) | `docs/` |

---

## 📚 Referências e Templates

| Recurso | Descrição | Localização |
|---------|-----------|-------------|
| Diagramas Mermaid | 5 diagramas arquiteturais (.mmd + .png) | `docs/diagrams/` |
| Scripts | seed-precedents, test-e2e-full, test-e2e-pipeline | `scripts/` |

---

## 📊 Diagramas

Todos os diagramas estão em `docs/diagrams/`:

1. **architecture.mmd** - Arquitetura completa do sistema
2. **ai_agents_flow.mmd** - Fluxo de agentes LangGraph
3. **database_schema.mmd** - Schema do PostgreSQL
4. **cicd_pipeline.mmd** - Pipeline CI/CD
5. **pdf_pipeline.mmd** - Pipeline de extração de PDF

Cada diagrama possui versão Mermaid (.mmd) e renderizada (.png).

---

## 🔄 Migração e Histórico

| Documento | Descrição | Tamanho |
|-----------|-----------|---------|
| [MIGRATION_FROM_V1.md](MIGRATION_FROM_V1.md) | Análise comparativa kratos v1 → v2 | 7.5KB |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de mudanças | 2.4KB |

---

## 🎯 Documentos por Fase do Projeto

### Fase 0 - Fundação ✅ Concluída (+ Hardening)
- [PHASE_0_REPORT.md](PHASE_0_REPORT.md) - Relatório de conclusão + hardening (9 issues corrigidos)
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura base
- [SUPABASE_INFO.md](SUPABASE_INFO.md) - Configuração DB
- [CHANGELOG.md](CHANGELOG.md) - v2.0.1 com correções Critical/High

### Fase 1 - Pipeline de PDF ✅ Concluída (scaffold)
- [EXECUTION_PLAN.md](EXECUTION_PLAN.md) - Seção Fase 1
- [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) - Análise de ferramentas PDF

### Fase 2 - Agentes de IA ✅ Concluída
- [EXECUTION_PLAN.md](EXECUTION_PLAN.md) - Seção Fase 2
- Diagrama: `ai_agents_flow.png`
- 70 testes AI (15 suites), LangGraph pipeline completo

### Fase 2.5 - E2E Wiring ✅ Concluída
- 100 precedentes STJ com embeddings, seed + E2E scripts

### Fase 3 - Frontend e HITL ✅ Concluída
- [EXECUTION_PLAN.md](EXECUTION_PLAN.md) - Seção Fase 3
- React 19 + Vite 6 + Tailwind 4 + shadcn/ui, 28 testes web
- [plans/2026-02-15-phase3-frontend-design.md](plans/2026-02-15-phase3-frontend-design.md) - Design doc

### Fase 4 - Tests, Monitoring & Deploy ✅ Concluída
- [DEPLOY.md](DEPLOY.md) - Procedimentos
- [EXECUTION_PLAN.md](EXECUTION_PLAN.md) - Seção Fase 4
- 171 testes totais, Sentry integrado, CI/CD com coverage, deploy workflows

---

## 📖 Guias Rápidos

### Como começar a desenvolver?
1. Leia [README.md](../README.md)
2. Configure ambiente seguindo [ENV.md](ENV.md)
3. Consulte [CLAUDE.md](../CLAUDE.md) para comandos

### Como entender a arquitetura?
1. Leia [ARCHITECTURE.md](ARCHITECTURE.md)
2. Veja diagramas em `docs/diagrams/`
3. Consulte [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) para decisões

### Como contribuir?
1. Leia [CONTRIBUTING.md](CONTRIBUTING.md)
2. Veja tarefas em [TODO.md](TODO.md)
3. Siga [ROADMAP.md](ROADMAP.md)

### Como fazer deploy?
1. Leia [DEPLOY.md](DEPLOY.md)
2. Configure segredos conforme [ENV.md](ENV.md)
3. Siga pipeline em `docs/diagrams/cicd_pipeline.png`

---

## ⭐ Documentos Essenciais

Se você tem tempo limitado, leia estes 5 documentos primeiro:

1. **[README.md](../README.md)** - O que é o KRATOS?
2. **[CLAUDE.md](../CLAUDE.md)** - Como desenvolver?
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Como funciona?
4. **[TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md)** - Por que essas escolhas?
5. **[EXECUTION_PLAN.md](EXECUTION_PLAN.md)** - Qual é o plano?

---

**Total de documentação**: 19 arquivos Markdown + 10 arquivos de diagrama + 4 scripts = **~110KB** de conhecimento estruturado

**Última atualização**: 15 de Fevereiro de 2026
