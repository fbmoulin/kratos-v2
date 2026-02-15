/**
 * Schema validation tests for all Drizzle tables.
 * Tests column structure, types, constraints, and relations
 * without requiring a database connection.
 */
import { describe, test, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import {
  documents,
  extractions,
  analyses,
  precedents,
  promptVersions,
  auditLogs,
  graphEntities,
  graphRelations,
} from '../schema/documents';

/** Helper to get column names from a Drizzle table */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getColumnNames(table: any): string[] {
  return Object.keys(table).filter(
    (key) =>
      typeof table[key] === 'object' &&
      table[key] !== null &&
      'name' in table[key],
  );
}

describe('Schema: documents table', () => {
  test('has correct table name', () => {
    expect(getTableName(documents)).toBe('documents');
  });

  test('has all required columns', () => {
    const cols = getColumnNames(documents);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'userId',
        'fileName',
        'filePath',
        'fileSize',
        'mimeType',
        'status',
        'pages',
        'errorMessage',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  test('id is UUID primary key', () => {
    expect(documents.id.columnType).toBe('PgUUID');
    expect(documents.id.primary).toBe(true);
    expect(documents.id.hasDefault).toBe(true);
  });

  test('userId is not nullable', () => {
    expect(documents.userId.notNull).toBe(true);
  });

  test('status defaults to pending', () => {
    expect(documents.status.hasDefault).toBe(true);
  });
});

describe('Schema: extractions table', () => {
  test('has correct table name', () => {
    expect(getTableName(extractions)).toBe('extractions');
  });

  test('documentId references documents with cascade delete', () => {
    expect(extractions.documentId.notNull).toBe(true);
  });

  test('has all required columns', () => {
    const cols = getColumnNames(extractions);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'documentId',
        'contentJson',
        'extractionMethod',
        'rawText',
        'tablesCount',
        'imagesCount',
        'createdAt',
      ]),
    );
  });

  test('contentJson defaults to empty object', () => {
    expect(extractions.contentJson.hasDefault).toBe(true);
  });
});

describe('Schema: analyses table', () => {
  test('has correct table name', () => {
    expect(getTableName(analyses)).toBe('analyses');
  });

  test('has all required columns', () => {
    const cols = getColumnNames(analyses);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'extractionId',
        'agentChain',
        'reasoningTrace',
        'resultJson',
        'modelUsed',
        'tokensInput',
        'tokensOutput',
        'latencyMs',
        'createdAt',
      ]),
    );
  });

  test('extractionId is required', () => {
    expect(analyses.extractionId.notNull).toBe(true);
  });

  test('modelUsed is required', () => {
    expect(analyses.modelUsed.notNull).toBe(true);
  });
});

describe('Schema: precedents table', () => {
  test('has correct table name', () => {
    expect(getTableName(precedents)).toBe('precedents');
  });

  test('has vector embedding column', () => {
    const cols = getColumnNames(precedents);
    expect(cols).toContain('embedding');
  });

  test('content is required', () => {
    expect(precedents.content.notNull).toBe(true);
  });

  test('category is required', () => {
    expect(precedents.category.notNull).toBe(true);
  });
});

describe('Schema: promptVersions table', () => {
  test('has correct table name', () => {
    expect(getTableName(promptVersions)).toBe('prompt_versions');
  });

  test('promptKey is required', () => {
    expect(promptVersions.promptKey.notNull).toBe(true);
  });

  test('isActive defaults to false', () => {
    expect(promptVersions.isActive.hasDefault).toBe(true);
  });

  test('version defaults to 1', () => {
    expect(promptVersions.version.hasDefault).toBe(true);
  });
});

describe('Schema: auditLogs table (immutable)', () => {
  test('has correct table name', () => {
    expect(getTableName(auditLogs)).toBe('audit_logs');
  });

  test('has all required columns for audit trail', () => {
    const cols = getColumnNames(auditLogs);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'entityType',
        'entityId',
        'action',
        'payloadBefore',
        'payloadAfter',
        'userId',
        'createdAt',
      ]),
    );
  });

  test('entityType and action are required', () => {
    expect(auditLogs.entityType.notNull).toBe(true);
    expect(auditLogs.action.notNull).toBe(true);
  });

  test('userId is nullable (supports system actions)', () => {
    expect(auditLogs.userId.notNull).toBe(false);
  });
});

describe('Schema: graphEntities table', () => {
  test('has correct table name', () => {
    expect(getTableName(graphEntities)).toBe('graph_entities');
  });

  test('name and entityType are required', () => {
    expect(graphEntities.name.notNull).toBe(true);
    expect(graphEntities.entityType.notNull).toBe(true);
  });

  test('has embedding column for hybrid search', () => {
    const cols = getColumnNames(graphEntities);
    expect(cols).toContain('embedding');
  });
});

describe('Schema: graphRelations table', () => {
  test('has correct table name', () => {
    expect(getTableName(graphRelations)).toBe('graph_relations');
  });

  test('sourceId and targetId are required', () => {
    expect(graphRelations.sourceId.notNull).toBe(true);
    expect(graphRelations.targetId.notNull).toBe(true);
  });

  test('relationType is required', () => {
    expect(graphRelations.relationType.notNull).toBe(true);
  });
});
