
10. **Sem plano de onboarding de usuários**: Advogados não são desenvolvedores. O KRATOS v2 inclui uma fase dedicada a documentação de usuário, tutoriais in-app e suporte inicial.

---

## Parte II — Plano de Execução Detalhado (KRATOS v2)

### Visão Geral do Cronograma

| Fase | Título | Duração Estimada | Dependências |
| :---: | :--- | :---: | :--- |
| 0 | Fundação, Segurança e CI/CD | 2-3 semanas | Nenhuma |
| 1 | Motor de Ingestão e Extração de PDF | 3-4 semanas | Fase 0 |
| 2 | Orquestração de Agentes e Lógica de IA | 3-4 semanas | Fases 0-1 |
| 3 | Frontend, HITL e Geração de Documentos | 2-3 semanas | Fases 0-2 |
| 4 | Testes, Monitoramento e Deploy | 2 semanas | Todas |
| **Total** | | **12-16 semanas** | |

---

### Fase 0: Fundação, Segurança e CI/CD

**Objetivo**: Estabelecer a infraestrutura segura, o repositório organizado e o pipeline de CI/CD, criando a base sobre a qual todo o desenvolvimento subsequente será construído.

**Duração Estimada**: 2-3 semanas

#### Tarefa 0.1 — Setup do Monorepo

A estrutura do monorepo é o alicerce organizacional do projeto. A recomendação é utilizar `pnpm workspaces` com `Turborepo` para gerenciar os pacotes internos, aproveitando o caching remoto para acelerar builds e testes.

```
kratos/
├── apps/
│   ├── api/          # Backend Node.js/Python (FastAPI ou Express)
│   └── web/          # Frontend React 19
├── packages/
│   ├── core/         # Lógica de negócio compartilhada
│   ├── db/           # Schema, migrations, ORM (Drizzle/Prisma)
│   ├── ai/           # Agentes LangGraph, prompts, RAG
│   └── tools/        # Utilitários (PDF extractor, DOCX generator)
├── workers/
│   └── pdf-worker/   # Worker Python para processamento de PDF
├── turbo.json
├── pnpm-workspace.yaml
└── .github/
    └── workflows/    # CI/CD com GitHub Actions
```

As tarefas específicas incluem: inicializar o repositório Git, configurar ESLint, Prettier e TypeScript, definir os scripts de build e dev no `turbo.json`, e configurar o caching remoto (via Vercel ou self-hosted).

#### Tarefa 0.2 — Banco de Dados Unificado (PostgreSQL)

Configurar um cluster PostgreSQL via **Supabase** (ou Neon como alternativa). O schema inicial deve incluir:

| Tabela | Propósito | Campos Chave |
| :--- | :--- | :--- |
| `users` | Autenticação (gerenciada pelo Supabase Auth) | `id`, `email`, `role`, `created_at` |
| `documents` | Metadados dos PDFs enviados | `id`, `user_id`, `filename`, `status`, `pages`, `created_at` |
| `extractions` | Conteúdo extraído dos PDFs | `id`, `document_id`, `content_json`, `extraction_method`, `created_at` |
| `analyses` | Resultado da análise dos agentes de IA | `id`, `extraction_id`, `agent_chain`, `reasoning_trace`, `result_json`, `model_used`, `created_at` |
| `audit_logs` | Trilha de auditoria imutável (Res. 615/2025) | `id`, `entity_type`, `entity_id`, `action`, `payload_before`, `payload_after`, `user_id`, `created_at` |
| `precedents` | Base de precedentes jurídicos para RAG | `id`, `content`, `embedding` (vector), `metadata`, `category` |
| `prompt_versions` | Versionamento de prompts de IA | `id`, `prompt_key`, `version`, `content`, `is_active`, `created_at` |

Implementar **triggers SQL** para popular automaticamente a tabela `audit_logs` em cada INSERT/UPDATE nas tabelas críticas, garantindo a imutabilidade exigida pela Resolução 615/2025. A tabela `audit_logs` deve ser particionada por mês para otimizar consultas históricas.

Habilitar a extensão `pgvector` e criar um índice HNSW na coluna `embedding` da tabela `precedents` para buscas vetoriais eficientes.

#### Tarefa 0.3 — Gestão de Segredos

Para o MVP, utilizar as variáveis de ambiente nativas do provedor de deploy (Vercel Environment Variables, Fly.io Secrets). Documentar todas as chaves necessárias:

| Segredo | Serviço | Uso |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase/Neon | Conexão com PostgreSQL |
| `SUPABASE_URL` / `SUPABASE_KEY` | Supabase | Autenticação e API |
| `OPENROUTER_API_KEY` | OpenRouter | Roteamento de modelos de IA |
| `GEMINI_API_KEY` | Google AI | Gemini 2.5 Flash (Vision/Reasoning) |
| `ANTHROPIC_API_KEY` | Anthropic | Claude Sonnet 4 / Opus 4 |
| `LANGSMITH_API_KEY` | LangChain | Tracing de agentes |
| `REDIS_URL` | Upstash/Redis Cloud | Cache |

Para a fase enterprise (pós-MVP), migrar para o **Infisical** com Machine Identities para rotação automática de segredos.

#### Tarefa 0.4 — Pipeline de CI/CD

Configurar **GitHub Actions** com os seguintes workflows:

1. **CI (Pull Request)**: Lint, type-check, testes unitários. Utilizar os filtros do Turborepo para executar apenas os pacotes afetados pela mudança.
2. **CD (Push para `main`)**: Build, testes de integração, deploy automático para staging.
3. **Release (Tag)**: Deploy para produção com aprovação manual.

**Checkpoint de Validação da Fase 0**: Ambiente de desenvolvimento funcional com banco de dados acessível, CI/CD executando com sucesso, e um endpoint "health check" da API respondendo em staging.

---

### Fase 1: Motor de Ingestão e Extração de PDF

**Objetivo**: Construir o pipeline assíncrono e performático para processar documentos jurídicos em PDF, extraindo texto, tabelas e imagens de forma estruturada.

**Duração Estimada**: 3-4 semanas

#### Tarefa 1.1 — Fila de Jobs Assíncronos

O processamento de PDFs é uma operação potencialmente longa (especialmente para documentos com mais de 50 páginas) e não deve bloquear a API principal. A recomendação é implementar uma fila de tarefas assíncronas:

Para o stack **Python** (recomendado para o worker de PDF): utilizar **Celery** com Redis como broker. O worker Python é ideal porque as bibliotecas de extração de PDF (Docling, pdfplumber) são nativas do ecossistema Python.

Para o stack **Node.js** (se o backend principal for em Node): utilizar **BullMQ** com Redis, delegando o processamento pesado para um worker Python via chamada HTTP ou gRPC.

O fluxo de processamento segue esta sequência:

1. O usuário faz upload do PDF via API.
2. A API salva o arquivo no storage (Supabase Storage ou S3) e cria um registro na tabela `documents` com status `pending`.
3. A API enfileira um job na fila de processamento.
4. O worker consome o job, processa o PDF e salva o resultado na tabela `extractions`.
5. O status do documento é atualizado para `completed` (ou `failed` em caso de erro).
6. O frontend é notificado via WebSocket ou polling.

#### Tarefa 1.2 — Pipeline de Extração Híbrida

O pipeline de extração deve ser modular, permitindo a combinação de diferentes ferramentas conforme o tipo de conteúdo encontrado no PDF:

**Etapa 1 — Extração Estrutural (Docling)**: O Docling processa o PDF completo, gerando uma representação estruturada do documento com identificação de seções, parágrafos, tabelas e figuras. O output é um JSON hierárquico que preserva a estrutura do documento original.

**Etapa 2 — Extração de Tabelas (pdfplumber)**: Para tabelas identificadas pelo Docling, o pdfplumber é utilizado como complemento para extrair os dados tabulares com alta precisão, convertendo-os em JSON estruturado.

**Etapa 3 — Análise de Imagens (Gemini 2.5 Flash)**: Imagens, gráficos e figuras identificados no documento são enviados para o Gemini 2.5 Flash via API de vision, que gera descrições textuais detalhadas. Estas descrições são inseridas no rastro de texto, enriquecendo o contexto para os agentes de IA.

**Etapa 4 — Validação (Pydantic)**: Todo o JSON extraído é validado contra schemas Pydantic rigorosos, garantindo a integridade dos dados antes de serem armazenados no banco de dados.

#### Tarefa 1.3 — Caching Inteligente

Implementar caching em **Redis** com as seguintes estratégias:

| Tipo de Cache | Chave | TTL | Invalidação |
| :--- | :--- | :---: | :--- |
| Resultado de extração | `extract:{hash_do_pdf}` | 7 dias | Re-upload do mesmo PDF |
| Resultado de OCR (imagens) | `ocr:{hash_da_imagem}` | 30 dias | Nunca (imagens são imutáveis) |
| Few-shots recuperados | `fewshot:{hash_do_embedding}` | 24 horas | Atualização da base de precedentes |

**Checkpoint de Validação da Fase 1**: Processar com sucesso um PDF jurídico de amostra (ex: uma petição inicial de 20+ páginas), validar o JSON de saída contra o schema Pydantic, e confirmar o armazenamento auditado no banco de dados.

---

### Fase 2: Orquestração de Agentes e Lógica de IA

**Objetivo**: Implementar o núcleo inteligente do KRATOS — o sistema de agentes que analisa o conteúdo extraído, classifica a matéria jurídica, aplica o framework FIRAC e gera a minuta.

**Duração Estimada**: 3-4 semanas

#### Tarefa 2.1 — Grafo de Decisão (LangGraph)

O fluxo de agentes é modelado como um grafo direcionado no LangGraph, onde cada nó representa um agente especializado e as arestas representam as transições condicionais:

```
[Input Extraído] 
    → [Supervisor de Complexidade]
        → (Simples) → [Agente Rápido - Gemini 2.5 Flash]
        → (Complexo) → [Roteador de Matéria]
            → [Agente Cível]
            → [Agente Penal]
            → [Agente Trabalhista]
            → [Agente Tributário]
                → [Gerador de Minuta]
                    → [Validador de Output]
                        → [HITL Review]
```

Cada agente utiliza **Zod** (TypeScript) ou **Pydantic** (Python) para validar seus outputs, garantindo que a saída de um agente seja compatível com a entrada do próximo. O **LangSmith** é integrado em cada nó para tracing completo, registrando o Chain-of-Thought de cada decisão.

#### Tarefa 2.2 — RAG e Few-Shot Engine

O sistema de Retrieval-Augmented Generation é o mecanismo que permite ao KRATOS "aprender" com precedentes jurídicos sem necessidade de fine-tuning:

1. **Indexação**: Precedentes jurídicos são processados, divididos em chunks semânticos e convertidos em embeddings (via modelo de embedding como `text-embedding-3-small` da OpenAI ou `models/text-embedding-004` do Google). Os embeddings são armazenados na tabela `precedents` com `pgvector`.

2. **Recuperação**: Quando um novo caso é analisado, o sistema gera um embedding do conteúdo extraído e busca os K precedentes mais similares (K=3 a 5) usando busca de similaridade coseno no `pgvector`.

3. **Injeção**: Os precedentes recuperados são formatados como few-shots e injetados no prompt do agente especialista, junto com instruções específicas para o tipo de matéria jurídica.

#### Tarefa 2.3 — Roteamento Inteligente de Modelos

O **Supervisor de Complexidade** é um agente leve que analisa o input e decide qual modelo utilizar, otimizando o equilíbrio entre custo e qualidade:

| Critério | Modelo Recomendado | Custo Relativo | Justificativa |
| :--- | :--- | :---: | :--- |
| Classificação de matéria (simples) | Gemini 2.5 Flash | Baixo | Tarefa de classificação rápida, não requer reasoning profundo. |
| Análise FIRAC (média complexidade) | Claude Sonnet 4 | Médio | Bom equilíbrio entre qualidade de reasoning e custo. |
| Geração de minuta (alta complexidade) | Claude Opus 4 | Alto | Máxima qualidade para outputs longos e nuançados. |
| Reasoning e análise de dados | Gemini 2.5 Flash | Baixo | Excelente capacidade de reasoning com custo reduzido. |

O roteamento pode ser implementado via **OpenRouter** (que oferece roteamento automático baseado em complexidade) ou via lógica customizada no Supervisor de Complexidade.

#### Tarefa 2.4 — Tracing e Observabilidade de IA

Integrar o **LangSmith** para monitoramento completo:

- Cada execução do grafo de agentes gera um "trace" com todos os passos, inputs, outputs e latências.
- O Chain-of-Thought de cada decisão é armazenado tanto no LangSmith quanto na tabela `analyses` do banco de dados, garantindo dupla auditabilidade.
- Dashboards no LangSmith permitem monitorar a acurácia, latência e custo dos agentes em tempo real.

**Checkpoint de Validação da Fase 2**: Executar o fluxo completo de agentes com um caso jurídico de teste, verificar o tracing no LangSmith, validar a minuta gerada contra um gabarito, e confirmar acurácia superior a 80% em testes manuais.

---

### Fase 3: Frontend, HITL e Geração de Documentos

**Objetivo**: Criar a interface de usuário, o fluxo de validação humana e o gerador de documentos Word, completando o ciclo full-stack do KRATOS.

**Duração Estimada**: 2-3 semanas

#### Tarefa 3.1 — Dashboard Principal

O frontend é desenvolvido em **React 19** com **Tailwind CSS 4** e **shadcn/ui**, priorizando uma UX limpa e intuitiva para advogados. A estética Glassmorphism (vidro fosco, sombras suaves) é aplicada com moderação para manter a profissionalidade. Os componentes principais incluem:

- **Tela de Upload**: Drag-and-drop para PDFs, com barra de progresso e estimativa de tempo.
- **Dashboard de Processos**: Bento Grid com cards mostrando o status de cada documento (pendente, processando, concluído, revisado).
- **Skeleton Loaders**: Animações pulsantes durante o processamento, simulando o "pensamento" da IA e fornecendo feedback visual ao usuário.

#### Tarefa 3.2 — Interface Human-in-the-Loop (HITL)

A tela de revisão é o componente mais crítico para compliance com a Resolução 615/2025 do CNJ, que exige supervisão humana sobre decisões de IA:

- **Painel de Raciocínio**: Exibe o Chain-of-Thought completo da IA, permitindo que o advogado compreenda como cada conclusão foi alcançada.
- **Editor de Minuta**: Permite edição direta do texto gerado, com diff-viewer para comparar a versão original da IA com as alterações do revisor.
- **Botões de Ação**: "Aprovar", "Solicitar Revisão" (retorna ao agente com feedback), "Rejeitar" (descarta a análise).
- **Modo Escuro**: Implementado com OKLCH para contraste otimizado, com ARIA labels em todos os componentes para acessibilidade.

#### Tarefa 3.3 — Gerador de DOCX

O gerador de documentos Word utiliza a biblioteca **docxtpl** (Python) para preencher templates oficiais com os dados validados pelo humano:

1. O advogado aprova a minuta na interface HITL.
2. O frontend envia uma requisição para o endpoint de geração.
3. O backend carrega o template `.docx` correspondente ao tipo de documento (petição, sentença, decisão liminar).
4. O `docxtpl` preenche o template com o JSON estruturado.
5. O documento gerado é disponibilizado para download e armazenado no storage com referência na tabela `audit_logs`.

**Checkpoint de Validação da Fase 3**: Deploy local do frontend, testar o fluxo completo de upload, processamento, revisão HITL e exportação DOCX. Validar a acessibilidade com ferramentas como Lighthouse e axe-core.

---

### Fase 4: Testes, Monitoramento e Deploy

**Objetivo**: Garantir a qualidade, a observabilidade e a estabilidade da aplicação em produção, com um processo de deploy seguro e reversível.

**Duração Estimada**: 2 semanas

#### Tarefa 4.1 — Cobertura de Testes

| Tipo de Teste | Ferramenta | Alvo de Cobertura | Foco |
| :--- | :--- | :---: | :--- |
| Unitários (Backend Python) | Pytest | >80% | Pipeline de extração, validação Pydantic, lógica de agentes. |
| Unitários (Frontend React) | Vitest ou Jest | >80% | Componentes UI, fluxo HITL, formulários. |
| Integração | Pytest + Testcontainers | >70% | Fluxo completo: upload -> extração -> análise -> geração. |
| End-to-End | Playwright | Fluxos críticos | Upload de PDF, revisão HITL, exportação DOCX. |

#### Tarefa 4.2 — Monitoramento e Observabilidade

A stack de monitoramento é composta por três camadas:

1. **Error Tracking (Sentry)**: Captura de exceções em tempo real no backend e frontend, com contexto de usuário e breadcrumbs para depuração rápida.
2. **Métricas de Infraestrutura (Prometheus + Grafana)**: Latência de endpoints, uso de CPU/memória, taxa de erros, tempo de processamento de PDFs.
3. **Tracing de IA (LangSmith)**: Monitoramento específico dos agentes de IA — latência por agente, custo por execução, taxa de acerto pós-HITL.

Definir **alertas** para cenários críticos: taxa de erro superior a 5%, latência de processamento de PDF superior a 60 segundos, custo diário de APIs de IA superior ao budget definido.

#### Tarefa 4.3 — Deploy em Produção

| Componente | Plataforma | Justificativa |
| :--- | :--- | :--- |
| Frontend (React) | Vercel | Excelente DX, CDN global, preview deploys para PRs, free tier generoso. |
| Backend API (Node.js) | Railway ou Fly.io | Simplicidade de deploy, auto-scaling, bom custo-benefício para MVP. |
(Content truncated due to size limit. Use line ranges to read remaining content)