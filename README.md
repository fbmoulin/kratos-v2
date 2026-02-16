# KRATOS - Sistema de Automação Jurídica de Elite

![Versão](https://img.shields.io/badge/version-2.4.0-blue)
![Status](https://img.shields.io/badge/status-beta-brightgreen)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/seu-usuario/kratos/ci.yml?branch=main)](https://github.com/seu-usuario/kratos/actions)
[![Licença](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**KRATOS (Knowledge-driven Reasoning and Automated Text Output System)** é uma plataforma de automação jurídica full-stack projetada para transformar processos judiciais complexos em minutas estruturadas, com auditabilidade total e conformidade com a Resolução 615/2025 do Conselho Nacional de Justiça (CNJ).

---

## Sumário

- [Visão Geral](#visão-geral)
- [Principais Funcionalidades](#principais-funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Começando](#começando)
  - [Pré-requisitos](#pré-requisitos)
  - [Instalação](#instalação)
- [Uso](#uso)
- [Roadmap](#roadmap)
- [Contribuição](#contribuição)
- [Licença](#licença)

---

## Visão Geral

O KRATOS utiliza uma arquitetura moderna baseada em agentes de IA para analisar documentos jurídicos em PDF, extrair informações cruciais, aplicar o framework FIRAC (Facts, Issue, Rule, Analysis, Conclusion) e gerar minutas de alta qualidade. A plataforma incorpora um fluxo de validação humana (Human-in-the-Loop) para garantir a precisão e a conformidade de cada documento gerado, atendendo aos rigorosos requisitos do setor jurídico.

O sistema é projetado para ser escalável, seguro e eficiente, utilizando as tecnologias mais avançadas de 2026 para processamento de documentos, orquestração de IA e desenvolvimento full-stack.

## Principais Funcionalidades

- **Pipeline de Extração Híbrida**: Utiliza Docling (IBM), pdfplumber e Gemini 2.5 Flash para extrair texto, tabelas e imagens de PDFs com alta precisão.
- **Orquestração de Agentes com LangGraph**: Modela o fluxo de análise jurídica como um grafo de agentes especializados (Supervisor, Roteador, Especialista), garantindo um processo de decisão transparente e auditável.
- **Retrieval-Augmented Generation (RAG)**: Utiliza `pgvector` para buscar precedentes jurídicos relevantes e injetá-los como few-shots nos prompts, especializando as respostas da IA sem a necessidade de fine-tuning.
- **Human-in-the-Loop (HITL)**: Interface de revisão dedicada para que advogados possam validar, editar e aprovar cada minuta gerada, garantindo controle total sobre o resultado final.
- **Auditoria Imutável**: Todas as ações e decisões da IA são registradas em trilhas de auditoria imutáveis no banco de dados, em conformidade com a Resolução 615/2025 do CNJ.
- **Geração de Documentos DOCX**: Exporta as minutas validadas para templates `.docx` oficiais.
- **Interface Moderna**: Dashboard intuitivo construído com React 19 e Tailwind CSS 4, com foco em usabilidade e acessibilidade.

## Stack Tecnológica

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS 4, shadcn/ui | Interface de usuário reativa, moderna e acessível. |
| **Backend API** | Node.js (Hono 4.7), TypeScript | API principal para gerenciar uploads, usuários e resultados. |
| **Banco de Dados** | PostgreSQL (via Supabase) | Armazenamento de metadados, extrações, análises e logs de auditoria. |
| **Busca Vetorial** | pgvector | Indexação e busca de similaridade para o sistema RAG. |
| **Orquestração de IA** | LangGraph | Modela e executa o fluxo de agentes de IA. |
| **Tracing de IA** | LangSmith | Monitoramento e depuração das cadeias de agentes. |
| **Processamento de PDF** | Docling, pdfplumber, Gemini 2.5 Flash | Pipeline híbrido para extração de dados de PDFs. |
| **Fila de Jobs** | Celery (Python) com Redis | Processamento assíncrono e pesado de documentos. |
| **Autenticação** | Supabase Auth | Gerenciamento de usuários e segurança. |
| **Deploy** | Vercel (Frontend), Railway (Backend) | Plataformas de deploy modernas, escaláveis e com excelente DX. |
| **CI/CD** | GitHub Actions | Automação de testes e deploys. |
| **Monorepo** | pnpm workspaces, Turborepo | Gerenciamento eficiente de pacotes e builds. |

## Estrutura do Projeto

O KRATOS é organizado como um monorepo utilizando `pnpm workspaces` e `Turborepo` para otimizar o desenvolvimento e o compartilhamento de código entre os diferentes serviços.

```
kratos/
├── apps/
│   ├── api/          # Backend (API principal)
│   └── web/          # Frontend (React App)
├── packages/
│   ├── core/         # Lógica de negócio compartilhada
│   ├── db/           # Schema do banco de dados, migrations, ORM
│   ├── ai/           # Configuração dos agentes LangGraph, prompts
│   └── tools/        # Ferramentas utilitárias (ex: gerador de DOCX)
├── workers/
│   └── pdf-worker/   # Worker assíncrono para processamento de PDF
├── .github/          # Workflows de CI/CD
├── docs/             # Documentação do projeto
└── ...
```

Para mais detalhes, consulte o documento de arquitetura em `docs/ARCHITECTURE.md`.

## Começando

Siga estas instruções para configurar e executar o ambiente de desenvolvimento local.

### Pré-requisitos

- Node.js (v22.x ou superior)
- pnpm (v9.x ou superior)
- Python (v3.11 ou superior)
- Docker e Docker Compose
- Uma conta no Supabase para o banco de dados PostgreSQL.
- Chaves de API para os serviços de IA (OpenRouter, Google AI, Anthropic) e LangSmith.

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/fbmoulin/kratos-v2.git
    cd kratos-v2
    ```

2.  **Instale as dependências:**
    ```bash
    pnpm install
    ```

3.  **Configure as variáveis de ambiente:**
    ```bash
    cp .env.example .env
    # Preencha as chaves: SUPABASE_URL, SUPABASE_KEY, DATABASE_URL,
    # ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
    # Consulte docs/ENV.md para a lista completa
    ```

4.  **Inicie os serviços de infraestrutura (Redis):**
    ```bash
    docker-compose up -d
    ```

5.  **Seed da base de precedentes (opcional, necessário para RAG):**
    ```bash
    pnpm seed
    ```

## Uso

Para iniciar todas as aplicações e workers em modo de desenvolvimento, execute o seguinte comando na raiz do projeto:

```bash
pnpm dev
```

O Turborepo irá gerenciar a execução paralela dos serviços:

-   **Frontend**: Disponível em `http://localhost:5173`
-   **Backend API**: Disponível em `http://localhost:3001`
-   **Celery Worker**: Iniciado e pronto para consumir jobs da fila.

## Status do Desenvolvimento

| Fase | Status | Descrição |
| :--- | :--- | :--- |
| **Fase 0** | ✅ Concluída | Fundação, monorepo, CI/CD, segurança |
| **Fase 1** | ✅ Concluída | API (Hono), documents CRUD, upload, PDF worker scaffold |
| **Fase 2** | ✅ Concluída | LangGraph pipeline (supervisor → router → RAG → FIRAC+ → drafter), model-router, 70 testes AI |
| **Fase 2.5** | ✅ Concluída | DB schema aplicado (8 tabelas + pgvector), 100 precedentes STJ seedados, scripts E2E |
| **Fase 3** | ✅ Concluída | Frontend (React 19 + Vite 6 + Tailwind 4 + shadcn/ui), Dashboard, HITL review UI, 28 testes web |
| **Fase 4** | ✅ Concluída | Vitest v8 coverage, Sentry (frontend + backend), CD workflows (Vercel + Railway), 179 testes |
| **Hardening** | 🔄 Em progresso | Sprints 1-2 completos (segurança, build/deploy), Sprints 3-5 pendentes |

### Métricas Atuais
- **179 testes** passando (70 AI + 26 API + 34 Web + 18 Core + 31 DB)
- **10 test suites** across 5 packages
- **8 tabelas** no Postgres com pgvector
- **100 precedentes** STJ com embeddings 1536d
- **4 CI/CD workflows** (CI, deploy-staging, deploy-production, integration)

Para uma visão detalhada do roadmap, consulte o arquivo `docs/ROADMAP.md`.

## Contribuição

Estamos abertos a contribuições da comunidade! Se você deseja contribuir, por favor, leia nosso guia de contribuição em `docs/CONTRIBUTING.md` para entender nossas diretrizes e fluxo de trabalho.

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
