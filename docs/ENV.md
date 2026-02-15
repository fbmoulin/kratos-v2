# Guia de Variáveis de Ambiente — KRATOS v2

**Autor**: Manus AI (Agente DevOps & Arquiteto de Soluções)
**Data**: 14 de Fevereiro de 2026
**Versão**: 1.0

---

## 1. Introdução

Este documento lista e descreve todas as variáveis de ambiente necessárias para configurar e executar os diferentes serviços do projeto **KRATOS v2**. É crucial que estas variáveis sejam configuradas corretamente em cada ambiente (desenvolvimento local, staging, produção) para garantir o funcionamento adequado da aplicação.

Para o desenvolvimento local, crie um arquivo `.env` na raiz de cada serviço (`apps/api`, `apps/web`, `workers/pdf-worker`) e preencha com os valores apropriados. **Nunca faça commit de arquivos `.env` para o repositório Git.**

---

## 2. Variáveis Globais (Comuns a Vários Serviços)

Estas variáveis são necessárias para a API, o worker e, em alguns casos, o frontend.

| Variável | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `NODE_ENV` | Define o ambiente de execução da aplicação. | `development`, `production`, `test` |
| `DATABASE_URL` | A URL de conexão completa para o banco de dados PostgreSQL. | `postgresql://user:password@host:port/database` |
| `REDIS_URL` | A URL de conexão para o servidor Redis, usado como broker do Celery e para caching. | `redis://:password@host:port` |

---

## 3. Variáveis do Backend (`apps/api`)

Estas variáveis são específicas para o serviço da API principal.

| Variável | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `PORT` | A porta em que o servidor da API irá escutar. | `3001` |
| `CORS_ORIGIN` | A URL do frontend que tem permissão para acessar a API. | `http://localhost:5173` |
| `SUPABASE_URL` | A URL do seu projeto Supabase. | `https://xyz.supabase.co` |
| `SUPABASE_KEY` | A chave de API `anon` do seu projeto Supabase. | `ey...` |
| `OPENROUTER_API_KEY` | A chave de API para o serviço OpenRouter, usado para roteamento de modelos de IA. | `sk-or-v1...` |
| `GEMINI_API_KEY` | A chave de API para o Google AI Studio (Gemini). | `AIza...` |
| `ANTHROPIC_API_KEY` | A chave de API para a Anthropic (Claude). | `sk-ant-api03...` |
| `OPENAI_API_KEY` | A chave de API para a OpenAI, usada para gerar embeddings (text-embedding-3-small, 1536d). | `sk-proj-...` |
| `LANGSMITH_API_KEY` | A chave de API para o LangSmith, usado para tracing e observabilidade de IA. | `ls__...` |

---

## 4. Variáveis do Frontend (`apps/web`)

Estas variáveis são expostas ao cliente (navegador) e devem ser prefixadas com `VITE_` (se estiver usando Vite).

| Variável | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | A URL base da API do KRATOS para o frontend fazer as requisições. | `http://localhost:3001/v2` |
| `VITE_SUPABASE_URL` | A URL do seu projeto Supabase, necessária para o cliente Supabase no frontend. | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | A chave de API `anon` do seu projeto Supabase, necessária para o cliente Supabase no frontend. | `ey...` |

---

## 5. Variáveis do Worker (`workers/pdf-worker`)

Estas variáveis são necessárias para o worker Celery que processa os PDFs.

| Variável | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `CELERY_BROKER_URL` | A URL do broker Redis para o Celery. Geralmente a mesma que `REDIS_URL`. | `redis://localhost:6379/0` |
| `CELERY_RESULT_BACKEND` | A URL do backend de resultados do Celery. Geralmente a mesma que `REDIS_URL`. | `redis://localhost:6379/0` |
| `SUPABASE_URL` | A URL do seu projeto Supabase. | `https://xyz.supabase.co` |
| `SUPABASE_KEY` | A chave de serviço (`service_role`) do seu projeto Supabase, pois o worker precisa de permissões elevadas para escrever no banco de dados. | `ey...` |
| `GEMINI_API_KEY` | A chave de API para o Google AI Studio (Gemini), usada no pipeline de extração. | `AIza...` |

---

## 6. Variáveis de Teste E2E

Estas variáveis são opcionais e usadas apenas para testes end-to-end em desenvolvimento.

| Variável | Descrição | Exemplo de Valor |
| :--- | :--- | :--- |
| `TEST_USER_ID` | UUID de um usuário fictício para bypass de autenticação em dev. Só funciona quando `NODE_ENV=development`. | `00000000-0000-0000-0000-000000000001` |
| `API_BASE_URL` | URL base da API para o script E2E. | `http://localhost:3001` |
