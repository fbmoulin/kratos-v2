# KRATOS v2 - Informações do Supabase

## Projeto Supabase

| Campo | Valor |
|-------|-------|
| **Nome** | KRATOS v2 |
| **Project ID** | qxttfjlgqkfurxxrorfn |
| **Ref** | qxttfjlgqkfurxxrorfn |
| **Organization ID** | nmbcumcqszkqurwnzyve |
| **Região** | sa-east-1 (São Paulo, Brasil) |
| **Criado em** | 2026-02-14T18:34:58.188787Z |
| **PostgreSQL Version** | 17.6.1 |
| **Status** | ACTIVE_HEALTHY |

## Endpoints

| Serviço | URL |
|---------|-----|
| **API URL** | https://qxttfjlgqkfurxxrorfn.supabase.co |
| **Database Host** | db.qxttfjlgqkfurxxrorfn.supabase.co |
| **Database Connection** | `postgresql://postgres:[YOUR-PASSWORD]@db.qxttfjlgqkfurxxrorfn.supabase.co:5432/postgres` |

## Configuração

### Extensões Habilitadas

- `uuid-ossp` - Geração de UUIDs
- `vector` (pgvector) - Vector embeddings para RAG
  - **Schema**: `extensions` (dedicado, conforme Security Advisor)
  - **Índice**: HNSW na coluna `embeddings` da tabela `precedents`

### Storage

| Bucket | Visibilidade | Max Size | Tipos Permitidos | Descrição |
|--------|--------------|----------|------------------|-----------|
| `documents` | Privado | 50MB | PDF apenas | Documentos judiciais enviados por usuários |

### Row-Level Security (RLS)

Todas as tabelas principais têm RLS habilitado:
- `documents` - Usuário acessa apenas seus próprios documentos
- `extractions` - Acesso via join com `documents`
- `analyses` - Acesso via join com `documents`
- `precedents` - Leitura pública, escrita restrita a admins
- `prompt_versions` - Leitura para agentes autenticados
- `audit_logs` - Append-only, leitura restrita a auditores

### Tabelas

| Tabela | Colunas | RLS | Descrição |
|--------|---------|-----|-----------|
| `documents` | 11 | ✅ | Metadados de PDFs |
| `extractions` | 8 | ✅ | Conteúdo extraído |
| `analyses` | 10 | ✅ | Resultados de IA |
| `precedents` | 7 | ✅ | Base RAG (pgvector) |
| `prompt_versions` | 6 | ✅ | Versionamento de prompts |
| `audit_logs` | 8 | ✅ | Auditoria imutável |

## Segurança

### Correções Aplicadas (Security Advisor)

✅ **search_path corrigido** - Extensões movidas para schema dedicado `extensions`
✅ **pgvector em schema separado** - Evita poluição do schema `public`
✅ **RLS em todas as tabelas** - Proteção de dados por usuário
✅ **Triggers de auditoria** - Logs imutáveis para compliance CNJ 615/2025

### Variáveis de Ambiente Necessárias

```bash
SUPABASE_URL=https://qxttfjlgqkfurxxrorfn.supabase.co
SUPABASE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

⚠️ **IMPORTANTE**: As chaves devem ser mantidas seguras via secrets do provedor de deploy.

## Monitoramento

- **Dashboard**: https://supabase.com/dashboard/project/qxttfjlgqkfurxxrorfn
- **Logs**: Acessíveis via dashboard Supabase
- **Métricas**: CPU, memória, queries/segundo disponíveis no painel

## Backup e Disaster Recovery

- **Backups automáticos**: Habilitados por padrão no Supabase
- **Retenção**: Conforme plano do Supabase (verificar dashboard)
- **Point-in-time recovery**: Disponível no plano Pro ou superior

## Limites do Plano

Consultar dashboard para limites atuais de:
- Database size
- Storage size
- Concurrent connections
- API requests/segundo

## Referências

- Console: https://supabase.com/dashboard/project/qxttfjlgqkfurxxrorfn
- Documentação: https://supabase.com/docs
- Status: https://status.supabase.com

---

**Última atualização**: 14 de Fevereiro de 2026
**Consulte**: `docs/PHASE_0_REPORT.md` para detalhes da configuração inicial
