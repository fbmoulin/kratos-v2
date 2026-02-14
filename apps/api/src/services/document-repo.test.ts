import { describe, test, expect, vi } from 'vitest';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockSet = vi.fn();

// Build chainable mock
const chain = () => ({
  select: mockSelect.mockReturnValue({
    from: mockFrom.mockReturnValue({
      where: mockWhere.mockReturnValue({
        orderBy: mockOrderBy.mockReturnValue({
          limit: mockLimit.mockReturnValue({
            offset: mockOffset.mockResolvedValue([]),
          }),
        }),
        limit: mockLimit.mockResolvedValue([]),
      }),
    }),
  }),
  insert: mockInsert.mockReturnValue({
    values: mockValues.mockReturnValue({
      returning: mockReturning.mockResolvedValue([{ id: 'new-doc' }]),
    }),
  }),
  update: mockUpdate.mockReturnValue({
    set: mockSet.mockReturnValue({
      where: mockWhere.mockResolvedValue([]),
    }),
  }),
});

vi.mock('@kratos/db', () => {
  const c = chain();
  return {
    db: c,
    documents: { id: 'id', userId: 'user_id', status: 'status', createdAt: 'created_at' },
    extractions: { documentId: 'document_id' },
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  count: vi.fn(() => 'count'),
  sql: vi.fn(),
}));

const { documentRepo } = await import('./document-repo.js');

describe('DocumentRepo', () => {
  test('module exports all required functions', () => {
    expect(documentRepo.listByUser).toBeDefined();
    expect(documentRepo.getById).toBeDefined();
    expect(documentRepo.create).toBeDefined();
    expect(documentRepo.getExtraction).toBeDefined();
  });
});
