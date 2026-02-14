# KRATOS - Sistema de Automação Jurídica de Elite

![Versão](https://img.shields.io/badge/version-2.0.0-blue)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
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
| **Backend API** | Node.js (Express) ou Python (FastAPI) | API principal para gerenciar uploads, usuários e resultados. |
| **Banco de Dados** | PostgreSQL (via Supabase) | Armazenamento de metadados, extrações, análises e logs de auditoria. |
| **Busca Vetorial** | pgvector | Indexação e busca de similaridade para o sistema RAG. |
| **Orquestração de IA** | LangGraph | Modela e executa o fluxo de agentes de IA. |
| **Tracing de IA** | LangSmith | Monitoramento e depuração das cadeias de agentes. |
| **Processamento de PDF** | Docling, pdfplumber, Gemini 2.5 Flash | Pipeline híbrido para extração de dados de PDFs. |
| **Fila de Jobs** | Celery (Python) com Redis | Processamento assíncrono e pesado de documentos. |
| **Autenticação** | Supabase Auth | Gerenciamento de usuários e segurança. |
| **Deploy** | Vercel (Frontend), Fly.io/Railway (Backend) | Plataformas de deploy modernas, escaláveis e com excelente DX. |
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
    git clone https://github.com/seu-usuario/kratos.git
    cd kratos
    ```

2.  **Instale as dependências:**
    ```bash
    pnpm install
    ```

3.  **Configure as variáveis de ambiente:**
    - Crie um arquivo `.env` na raiz de cada aplicação em `apps/` e no worker em `workers/`.
    - Consulte o arquivo `docs/ENV.md` para a lista completa de variáveis necessárias.

4.  **Inicie os serviços de infraestrutura (Redis):**
    ```bash
    docker-compose up -d
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

## Roadmap

O desenvolvimento do KRATOS v2 está planejado em 4 fases principais, com uma duração total estimada de 12 a 16 semanas para o MVP.

-   **Fase 0: Fundação, Segurança e CI/CD** (2-3 semanas)
-   **Fase 1: Motor de Ingestão e Extração de PDF** (3-4 semanas)
-   **Fase 2: Orquestração de Agentes e Lógica de IA** (3-4 semanas)
-   **Fase 3: Frontend, HITL e Geração de Documentos** (2-3 semanas)
-   **Fase 4: Testes, Monitoramento e Deploy** (2 semanas)

Para uma visão detalhada do roadmap, consulte o arquivo `docs/ROADMAP.md`.

## Contribuição

Estamos abertos a contribuições da comunidade! Se você deseja contribuir, por favor, leia nosso guia de contribuição em `docs/CONTRIBUTING.md` para entender nossas diretrizes e fluxo de trabalho.

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
