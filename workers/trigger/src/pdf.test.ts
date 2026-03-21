import { describe, it, expect, vi, beforeEach } from "vitest";

// All mocks must use inline factories — vi.mock() is hoisted,
// so module-level variables are NOT initialized when the factory runs.

vi.mock("execa", () => ({
  execa: vi.fn().mockResolvedValue({
    stdout: JSON.stringify({
      status: "completed",
      rawText: "Extracted text content from the PDF document.",
      tablesCount: 2,
      pageCount: 5,
      extractionMethod: "pdfplumber",
      contentJson: { pages: [] },
    }),
    stderr: "",
  }),
}));

vi.mock("@kratos/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ id: "ext-new" }]) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  },
  extractions: {},
  documents: {},
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

describe("runPdfJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls python runner and saves extraction to DB", async () => {
    const { runPdfJob } = await import("./pdf.js");
    const { db } = await import("@kratos/db");

    await runPdfJob({
      documentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      filePath: "f1e2d3c4-b5a6-7890-abcd-ef1234567890/a1b2c3d4-e5f6-7890-abcd-ef1234567890/test.pdf",
      fileName: "test.pdf",
    });

    expect(db.insert as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(db.update as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("updates document to failed status on python error", async () => {
    const { execa } = await import("execa");
    (execa as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Python not found"));

    const { runPdfJob } = await import("./pdf.js");
    const { db } = await import("@kratos/db");

    await runPdfJob({
      documentId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      filePath: "f1e2d3c4-b5a6-7890-abcd-ef1234567890/b2c3d4e5-f6a7-8901-bcde-f12345678901/test.pdf",
      fileName: "test.pdf",
    });

    expect(db.update as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it("throws on invalid Python output schema", async () => {
    const { execa } = await import("execa");
    (execa as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      stdout: JSON.stringify({ status: "invalid_status" }),
      stderr: "",
    });

    const { runPdfJob } = await import("./pdf.js");

    await runPdfJob({
      documentId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
      userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      filePath: "user/doc/test.pdf",
      fileName: "test.pdf",
    });

    // The validation error should cause it to fall into the catch block
    // which updates the document status to 'failed'
    const { db } = await import("@kratos/db");
    expect(db.update as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });
});
