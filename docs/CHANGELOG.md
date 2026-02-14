# Changelog - KRATOS v2

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Adicionado
- Estrutura inicial do monorepo com pnpm e Turborepo.
- Configuração do pipeline de CI/CD com GitHub Actions para testes e linting.
- Documentação inicial do projeto: README, ROADMAP, ARCHITECTURE, CONTRIBUTING, SECURITY, API, DEPLOY, CHANGELOG, TODO, ENV.

### Modificado
- Nada ainda.

### Removido
- Nada ainda.

---

## [2.0.0] - 2026-02-14

### Adicionado
- **Plano de Execução KRATOS v2**: Documento detalhado com análise DevOps, brainstorm, reasoning crítico e plano de execução faseado.
- **Arquitetura Orientada a Agentes**: Definição da arquitetura baseada em LangGraph para orquestração de agentes de IA.
- **Pipeline de Extração Híbrido**: Estratégia de extração de PDF utilizando Docling, pdfplumber e Gemini 2.5 Flash.
- **Estratégia de RAG**: Implementação de Retrieval-Augmented Generation com `pgvector` para especialização de IA sem fine-tuning.
- **Conformidade com CNJ e LGPD**: Definição de trilhas de auditoria imutáveis e práticas de privacidade desde o design.
- **Roadmap Detalhado**: Cronograma visual e detalhamento das fases de desenvolvimento do MVP.
- **Documentos de Projeto**: Criação de todos os documentos essenciais para um projeto enterprise (README, ROADMAP, ARCHITECTURE, etc.).

### Modificado
- **Correção Crítica de Arquitetura**: Substituída a proposta inviável de "pgvector no TiDB" pela unificação em PostgreSQL (Supabase) para o MVP.
- **Stack de IA Atualizada**: Substituído o fine-tuning de Claude (indisponível) pela estratégia de RAG e roteamento inteligente de modelos via OpenRouter.
- **Cronograma Realista**: Ajustada a estimativa de tempo do projeto de 8-12 semanas para 12-16 semanas.
- **Eliminação de Sobreposição**: Removido o Kestra do plano inicial, focando em LangGraph e uma fila de tarefas assíncronas (Celery/BullMQ).

### Removido
- Proposta de uso do `marker-pdf` como extrator principal, substituído pelo Docling.
- Proposta de uso do Tesseract OCR, substituído pelo Gemini 2.5 Flash (Vision).
