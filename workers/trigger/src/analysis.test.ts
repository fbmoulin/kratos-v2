import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock heavy dependencies before importing the task
vi.mock("@kratos/ai", () => ({
  createAnalysisWorkflow: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      firacResult: { facts: "test facts" },
      draftResult: "test draft",
      routerResult: { reasoning: "test" },
      modelUsed: "claude-sonnet-4-5",
      tokensInput: 100,
      tokensOutput: 200,
    }),
  })),
  createInitialState: vi.fn((opts) => opts),
}));

vi.mock("@kratos/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  analyses: {},
  documents: {},
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

describe("runAnalysisJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls workflow.invoke with correct payload", async () => {
    const { runAnalysisJob } = await import("./analysis.js");
    const { createAnalysisWorkflow } = await import("@kratos/ai");

    const payload = {
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      extractionId: "e1f2a3b4-c5d6-7890-abcd-ef1234567890",
      rawText: "This is a test legal document with sufficient content.",
    };

    await runAnalysisJob(payload);

    const mockWorkflow = (createAnalysisWorkflow as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: payload.documentId, rawText: payload.rawText })
    );
  });

  it("inserts analysis into DB on success", async () => {
    const { runAnalysisJob } = await import("./analysis.js");
    const { db } = await import("@kratos/db");

    await runAnalysisJob({
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      extractionId: "e1f2a3b4-c5d6-7890-abcd-ef1234567890",
      rawText: "Test document content for analysis.",
    });

    expect((db.insert as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it("updates document status to failed on workflow error", async () => {
    const { createAnalysisWorkflow } = await import("@kratos/ai");
    (createAnalysisWorkflow as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      invoke: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    });

    const { runAnalysisJob } = await import("./analysis.js");
    const { db } = await import("@kratos/db");

    await runAnalysisJob({
      documentId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      extractionId: "e1f2a3b4-c5d6-7890-abcd-ef1234567890",
      rawText: "Test content.",
    });

    // Should update status to failed, not throw
    expect((db.update as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});
