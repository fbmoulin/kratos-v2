# Prompt Governance — KRATOS v2

## Overview

KRATOS v2 implements a strict prompt governance system to ensure:
1. **No silent fallback** in production — if the DB fails, the system errors loudly instead of using stale/default prompts
2. **Full provenance** — every analysis records which prompt (key, version, hash) was used
3. **Lifecycle management** — prompts follow a `draft → approved → active → rolled_back` lifecycle
4. **Integrity verification** — content hashes detect unauthorized modifications

## Prompt Lifecycle

```
draft → approved → active → rolled_back
```

- **draft**: Newly created prompt version. Cannot be activated directly.
- **approved**: Reviewed and approved by a team member. Ready for activation.
- **active**: Currently in use. Only ONE version per `promptKey` can be active.
- **rolled_back**: Previously active, replaced by a newer version.

## Environment Behavior

| Environment | DB Failure Behavior | Fallback Allowed |
|-------------|-------------------|------------------|
| `production` | Throws error, blocks analysis | No |
| `staging` | Throws error, blocks analysis | No |
| `development` | Warns in console, uses hardcoded fallback | Yes |
| `test` | Silent, uses hardcoded fallback | Yes |

## API Endpoints

### List Active Prompts
```
GET /v2/prompts
→ { data: [{ promptKey, version, content, isActive, status, contentHash }] }
```

### List Versions for a Key
```
GET /v2/prompts/:key
→ { data: [{ promptKey, version, content, isActive, status, contentHash }] }
```

### Validate Active Prompt
```
POST /v2/prompts/:key/validate
Body (optional): { expectedHash: "sha256..." }
→ { valid: true/false, promptKey, activeVersion, contentHash, status, message }
```

### Activate a Version
```
POST /v2/prompts/:key/activate/:version
→ { data: { ...promptVersion } }
```
Creates an audit log entry with `action: 'prompt:activate'`.

## Provenance in Analysis Records

Every analysis record (`analyses` table) stores:
- `prompt_key` — which prompt was used (e.g., `firac-enterprise`)
- `prompt_version` — version number at time of analysis
- `prompt_hash` — SHA-256 of the prompt content at time of use

This allows complete traceability from any analysis back to the exact prompt that generated it.

## Integrity Validation

Before running an analysis in production, the system validates prompt integrity by comparing the resolved prompt's SHA-256 hash against the stored hash in `prompt_versions`:

```typescript
const validation = await promptRepo.validate(promptKey);
if (!validation.valid) {
  throw new Error(validation.message); // blocks analysis
}
```

This catches scenarios where prompt content was modified directly in the database without going through the proper lifecycle (`draft → approved → active`).

The validation endpoint (`POST /v2/prompts/:key/validate`) also accepts an optional `expectedHash` for external tooling to verify prompt integrity.

## Contracts

See `@kratos/core` for formal schemas:
- `PromptValidationRequestSchema` / `PromptValidationResponseSchema`

## Registered Prompt Keys

| Key | Purpose |
|-----|---------|
| `router` | Document classification (LegalMatter + DecisionType) |
| `firac-enterprise` | FIRAC+ Enterprise v3.0 analysis |
| `drafter-generico` | Generic legal draft generation |
| `drafter-bancario` | Banking law draft generation |
| `drafter-consumidor` | Consumer law draft generation |
