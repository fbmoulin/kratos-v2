import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: {
    trigger: vi.fn().mockResolvedValue({ id: "run_test123" }),
  },
}));

describe("triggerService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("triggers pdf-extraction task with correct payload", async () => {
    const { triggerService } = await import("./trigger.js");
    const { tasks } = await import("@trigger.dev/sdk/v3");

    await triggerService.enqueuePdfExtraction({
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      filePath: "user/doc/test.pdf",
      fileName: "test.pdf",
    });

    expect(tasks.trigger).toHaveBeenCalledWith("pdf-extraction", {
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      filePath: "user/doc/test.pdf",
      fileName: "test.pdf",
    });
  });

  it("triggers analysis-job task with correct payload", async () => {
    const { triggerService } = await import("./trigger.js");
    const { tasks } = await import("@trigger.dev/sdk/v3");

    await triggerService.enqueueAnalysis({
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      extractionId: "e1f2a3b4-c5d6-7890-abcd-ef1234567890",
      rawText: "legal text content",
    });

    expect(tasks.trigger).toHaveBeenCalledWith("analysis-job", expect.objectContaining({
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    }));
  });

  it("triggers docx-export task with correct payload", async () => {
    const { triggerService } = await import("./trigger.js");
    const { tasks } = await import("@trigger.dev/sdk/v3");

    await triggerService.enqueueDocxExport({
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      fileName: "test.docx",
    });

    expect(tasks.trigger).toHaveBeenCalledWith("docx-export", expect.objectContaining({
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    }));
  });
});
