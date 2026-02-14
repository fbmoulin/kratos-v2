# Phase 0 Templates - Referência de Código

Este diretório contém templates e exemplos de código da Fase 0 do projeto KRATOS v2, preservados como referência histórica e documentação de padrões implementados.

## Conteúdo

### API Routes e Middlewares

- **`auth.ts`** - Middleware de autenticação Supabase JWT
- **`documents.ts`** - Rotas CRUD para documentos (upload, listagem, detalhes)
- **`health.ts`** - Health check endpoints (liveness, readiness probes)
- **`rate-limit.ts`** - Middleware de rate limiting com Redis
- **`index.ts`** - Entry point da API (exemplo Hono)

### Configurações

- **`drizzle.config.ts`** - Configuração do Drizzle ORM para migrations
- **`vite.config.ts`** - Configuração do Vite para o frontend React

## Uso

Estes arquivos são **referência** para entender os padrões estabelecidos na Fase 0. Não devem ser copiados diretamente - o código de produção está nos respectivos workspaces:

- API Routes → `apps/api/src/routes/`
- Middlewares → `apps/api/src/middleware/`
- Configurações → Raiz de cada workspace

## Padrões Estabelecidos

### 1. Autenticação (auth.ts)
- Validação de JWT do Supabase via headers
- Extração de `user_id` do token
- Middleware reutilizável com Hono

### 2. Rate Limiting (rate-limit.ts)
- Redis como backend de contagem
- Limite configurável por rota
- Headers `X-RateLimit-*` na resposta

### 3. Health Checks (health.ts)
- `/health` - Liveness probe (servidor respondendo?)
- `/health/ready` - Readiness probe (dependências acessíveis?)
- Verificação de conectividade com DB e Redis

### 4. CRUD de Documentos (documents.ts)
- Upload de PDF com validação de tipo e tamanho
- Storage no Supabase Storage
- Registro na tabela `documents` com RLS

## Histórico

Estes templates foram criados durante a **Fase 0 - Fundação, Segurança e CI/CD** (concluída em 14/02/2026). Representam a primeira implementação funcional do backend KRATOS v2 com Hono + Supabase.

Consulte `docs/PHASE_0_REPORT.md` para detalhes completos da execução da Fase 0.
