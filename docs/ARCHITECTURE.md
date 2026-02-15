# Arquitetura do Sistema KRATOS v2

**Autor**: Manus AI (Agente DevOps & Arquiteto de Soluções)
**Data**: 15 de Fevereiro de 2026
**Versão**: 2.4

---

## 1. Visão Geral da Arquitetura

O KRATOS v2 é projetado como um sistema distribuído, orientado a eventos e centrado em IA, construído sobre uma arquitetura de microsserviços desacoplados orquestrados por um sistema de agentes inteligentes. A arquitetura visa a escalabilidade, manutenibilidade, segurança e conformidade regulatória (Resolução 615/2025 do CNJ e LGPD), priorizando a automação de processos jurídicos complexos com total auditabilidade.

A arquitetura pode ser dividida em quatro camadas principais:

1.  **Camada de Apresentação (Frontend)**: Uma Single-Page Application (SPA) reativa construída com React 19, responsável pela interação com o usuário, upload de documentos e a interface de Human-in-the-Loop (HITL).
2.  **Camada de Orquestração e API (Backend)**: Um serviço de API (Node.js/Hono 4.7) que serve como ponto de entrada para o sistema, gerenciando a autenticação (Supabase Auth), o fluxo de dados e a comunicação com a fila de tarefas.
3.  **Camada de Processamento Assíncrono (Workers)**: Workers dedicados (Python/Celery) que executam as tarefas pesadas e de longa duração, como a extração de conteúdo de PDFs e a execução dos pipelines de IA.
4.  **Camada de Persistência e Dados (Infraestrutura)**: Um conjunto de serviços gerenciados, incluindo um banco de dados PostgreSQL com capacidades vetoriais, um broker de mensagens Redis, e serviços de armazenamento de arquivos.

![Diagrama da Arquitetura](https://i.imgur.com/example.png) <!-- Placeholder para um diagrama futuro -->

---

## 2. Estrutura do Projeto (Monorepo)

Para gerenciar a complexidade de múltiplos pacotes e aplicações, o KRATOS v2 adota uma estrutura de monorepo utilizando **pnpm workspaces** e **Turborepo**. Esta abordagem centraliza o código, simplifica o gerenciamento de dependências e acelera os processos de build e teste através de caching inteligente.

```
kratos/
├── apps/
│   ├── api/          # Backend (Hono 4.7 + Node.js)
│   └── web/          # Frontend (React 19 + Vite 6 + Tailwind 4)
├── packages/
│   ├── core/         # Lógica de negócio compartilhada, tipos e constantes
│   ├── db/           # Schema do banco de dados, migrations e ORM (Drizzle)
│   ├── ai/           # Lógica dos agentes LangGraph, prompts e motor RAG
│   └── tools/        # Utilitários (extrator de PDF, gerador de DOCX)
├── workers/
│   └── pdf-worker/   # Worker Python (Celery) para processamento de PDF
├── turbo.json
├── pnpm-workspace.yaml
└── .github/
    └── workflows/    # Pipelines de CI/CD com GitHub Actions
```

-   **Turborepo**: Orquestra os scripts de build, teste e lint, garantindo que apenas os pacotes afetados por uma alteração sejam reprocessados.
-   **pnpm Workspaces**: Gerencia as dependências de forma eficiente, evitando duplicação e garantindo consistência entre os pacotes.

---

## 3. Camada de Persistência e Dados

### 3.1. Banco de Dados Unificado (PostgreSQL)

O coração da camada de dados é um cluster **PostgreSQL** gerenciado pelo **Supabase**. Esta escolha unifica o armazenamento relacional, a busca vetorial e a autenticação em uma única plataforma, simplificando a arquitetura do MVP.

-   **Extensão `pgvector`**: Habilitada para permitir a indexação e a busca de similaridade de embeddings vetoriais, sendo a base para o motor de Retrieval-Augmented Generation (RAG).
-   **Índice HNSW**: Utilizado na coluna de embeddings para garantir buscas vetoriais de alta performance.
-   **ORM (Drizzle)**: Abstrai a comunicação com o banco de dados, oferecendo segurança de tipos e facilitando futuras migrações.
-   **Auditoria Imutável**: Triggers SQL na tabela `audit_logs` garantem a conformidade com a Resolução 615/2025, registrando todas as alterações em dados críticos de forma automática e imutável.

### 3.2. Fila de Mensagens e Cache (Redis)

O **Redis**, gerenciado pelo Upstash, desempenha duas funções críticas:

1.  **Message Broker para Celery**: Gerencia a fila de tarefas assíncronas, garantindo que o processamento de PDFs não bloqueie a API principal e possa ser escalado de forma independente.
2.  **Cache de Alta Performance**: Armazena resultados de operações custosas, como extrações de PDF e chamadas a APIs de IA, reduzindo a latência e os custos operacionais. As estratégias de invalidação são baseadas em TTL (Time-to-Live) e eventos.

### 3.3. Armazenamento de Arquivos

O **Supabase Storage** é utilizado para o armazenamento seguro dos documentos PDF enviados pelos usuários. Ele se integra nativamente com o sistema de autenticação e as políticas de acesso do Supabase.

---

## 4. Camada de Processamento Assíncrono

### 4.1. Pipeline de Ingestão e Extração

O processamento de documentos é uma operação assíncrona orquestrada pelo **Celery** e executada por workers Python. O fluxo é o seguinte:

1.  A API recebe o upload do PDF, salva-o no Supabase Storage e enfileira um job no Redis.
2.  Um worker Celery consome o job da fila.
3.  O worker executa um **pipeline de extração híbrida**:
    a.  **Docling (IBM)**: Realiza a extração principal da estrutura do documento (texto, seções, tabelas).
    b.  **pdfplumber**: Atua como um extrator secundário para tabelas, oferecendo alta precisão.
    c.  **Gemini 2.5 Flash (Vision)**: Analisa imagens e gráficos extraídos, gerando descrições textuais.
4.  O conteúdo extraído é validado por schemas **Pydantic** e salvo na tabela `extractions`.
5.  O status do documento é atualizado e o frontend é notificado.

### 4.2. Orquestração de Agentes de IA (LangGraph)

O núcleo da inteligência do KRATOS é um grafo de agentes construído com **LangGraph**. Esta abordagem modela o processo de análise jurídica como um fluxo de estados, onde cada nó é um agente especializado e as arestas são transições condicionais.

-   **Supervisor de Complexidade**: Um agente inicial que roteia a tarefa para o fluxo apropriado com base na complexidade do documento, otimizando o uso de modelos de IA.
-   **Agentes Especialistas**: Agentes focados em matérias específicas (Cível, Penal, etc.) que aplicam o framework FIRAC (Facts, Issue, Rule, Application, Conclusion).
-   **Motor RAG**: Antes de cada geração, o sistema recupera precedentes jurídicos relevantes do banco de dados (`pgvector`) e os injeta no prompt como exemplos (few-shot prompting), guiando o modelo para a linguagem e o formato corretos.
-   **Roteamento de Modelos (OpenRouter)**: O sistema utiliza o OpenRouter para selecionar dinamicamente o melhor modelo de IA (ex: Gemini 2.5 Flash, Claude Sonnet 4, Claude Opus 4) para cada tarefa, equilibrando custo, velocidade e qualidade de reasoning.

---

## 5. Segurança e Conformidade

### 5.1. Gestão de Segredos

No MVP, os segredos (chaves de API, URLs de banco de dados) são gerenciados através das **variáveis de ambiente** do provedor de deploy (Vercel, Fly.io). Para a fase enterprise, está planejada a migração para uma solução de vault centralizada como o **Infisical**, que permite a rotação automática e o gerenciamento de identidades de máquina.

### 5.2. Autenticação e Autorização

O **Supabase Auth** gerencia todo o ciclo de vida da autenticação de usuários, incluindo registro, login e gerenciamento de sessão via JWTs. As políticas de Row-Level Security (RLS) do PostgreSQL são utilizadas para garantir que os usuários só possam acessar seus próprios dados.

### 5.3. Conformidade (LGPD e CNJ)

-   **LGPD**: O sistema é projetado com princípios de *privacy by design*, incluindo a anonimização de dados em logs, políticas de retenção de dados e consentimento explícito do usuário.
-   **Resolução 615/2025 CNJ**: A trilha de auditoria imutável, implementada via triggers no banco de dados, garante a rastreabilidade completa de todas as operações e decisões de IA, conforme exigido pela resolução.

---

## 6. CI/CD e Monitoramento

### 6.1. Pipeline de CI/CD

O pipeline de integração e entrega contínua é automatizado com **GitHub Actions**:

-   **CI (em Pull Requests)**: Executa linting, checagem de tipos e testes unitários nos pacotes afetados pela alteração.
-   **CD (em push para `main`)**: Realiza o build, executa testes de integração e faz o deploy automático para o ambiente de staging.
-   **Release (em criação de tag)**: Promove o deploy para o ambiente de produção após aprovação manual.

### 6.2. Observabilidade e Tracing

-   **Sentry**: Integrado no frontend (`@sentry/react` com ErrorBoundary) e no backend (`@sentry/node` via `app.onError`) para error tracking em tempo real, session replay e performance monitoring.
-   **Health Checks**: Endpoint `/v2/health/ready` verifica conectividade com DB e Redis, retornando 503 se degradado. Endpoint `/v2/health/metrics` expõe request count, error rate e latência média.
-   **LangSmith**: Planejado para integração com agentes de IA, fornecendo tracing detalhado (Chain-of-Thought) de cada decisão.
-   **Logging Estruturado**: Todas as aplicações e workers geram logs estruturados em JSON, que podem ser agregados em uma plataforma de observabilidade (ex: Datadog, New Relic) para monitoramento em tempo real e criação de alertas.
