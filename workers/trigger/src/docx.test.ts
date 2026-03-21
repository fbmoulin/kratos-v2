import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({ upload: mockUpload });
const mockSupabaseClient = { storage: { from: mockFrom } };

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock("@kratos/tools", () => ({
  buildDocxBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-docx")),
}));

// Flexible DB mock: each select() call is a separate chain
const makeSelectChain = (result: unknown[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(result) }),
    }),
    orderBy: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(result),
    }),
  }),
});

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockDb = {
  select: vi.fn(),
  insert: mockInsert,
};

vi.mock("@kratos/db", () => ({
  db: mockDb,
  documents: {},
  extractions: {},
  analyses: {},
  auditLogs: {},
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), desc: vi.fn() }));

describe("runDocxJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads DOCX buffer to Supabase Storage when doc is reviewed", async () => {
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-123", userId: "user-456", fileName: "test.pdf", status: "reviewed" }]))
      .mockReturnValueOnce(makeSelectChain([{ id: "ext-789", documentId: "doc-123" }]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "ana-101", resultJson: { draftResult: "# Test Draft\n\nLegal content." } }]),
            }),
          }),
        }),
      });

    const { runDocxJob } = await import("./docx.js");
    const { buildDocxBuffer } = await import("@kratos/tools");

    await runDocxJob({ documentId: "doc-123", userId: "user-456", fileName: "test.docx" });

    expect(buildDocxBuffer).toHaveBeenCalledWith(
      expect.stringContaining("Test Draft"),
      expect.objectContaining({ title: "test" })
    );
    expect(mockUpload).toHaveBeenCalled();
  });

  it("skips upload if document status is not reviewed", async () => {
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-456", userId: "user-456", fileName: "test.pdf", status: "pending" }]));

    const { runDocxJob } = await import("./docx.js");
    const { buildDocxBuffer } = await import("@kratos/tools");

    await runDocxJob({ documentId: "doc-456", userId: "user-456", fileName: "test.docx" });

    expect(buildDocxBuffer).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("creates audit log on successful export", async () => {
    mockDb.select
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-123", userId: "user-456", fileName: "test.pdf", status: "reviewed" }]))
      .mockReturnValueOnce(makeSelectChain([{ id: "ext-789", documentId: "doc-123" }]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "ana-101", resultJson: { draftResult: "# Draft content" } }]),
            }),
          }),
        }),
      });

    const { runDocxJob } = await import("./docx.js");
    await runDocxJob({ documentId: "doc-123", userId: "user-456", fileName: "test.docx" });

    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'document',
        entityId: 'doc-123',
        action: 'export:completed',
      })
    );
  });

  it("creates audit log on export failure", async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: 'Storage full' } });

    mockDb.select
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-123", userId: "user-456", fileName: "test.pdf", status: "reviewed" }]))
      .mockReturnValueOnce(makeSelectChain([{ id: "ext-789", documentId: "doc-123" }]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: "ana-101", resultJson: { draftResult: "# Draft" } }]),
            }),
          }),
        }),
      });

    const { runDocxJob } = await import("./docx.js");
    await expect(runDocxJob({ documentId: "doc-123", userId: "user-456", fileName: "test.docx" }))
      .rejects.toThrow('DOCX upload failed');

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'export:failed',
        payloadAfter: expect.objectContaining({ error: 'Storage full' }),
      })
    );
  });
});
