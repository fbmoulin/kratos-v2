import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createHash } from "node:crypto";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, extractions, documents } from "@kratos/db";
import { eq } from "drizzle-orm";
import pino from "pino";
import { ExtractionOutputSchema } from "@kratos/core";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_RUNNER = path.join(__dirname, "pdf_runner.py");

export const PdfPayloadSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  /** SHA-256 of the uploaded PDF for provenance tracking */
  pdfHash: z.string().length(64).optional(),
});

export type PdfPayload = z.infer<typeof PdfPayloadSchema>;

/** Pure function — testable without Trigger.dev runtime */
export async function runPdfJob(payload: PdfPayload): Promise<void> {
  const { documentId, userId, filePath, pdfHash } = payload;
  const startMs = Date.now();

  try {
    // Invoke Python pipeline via stdin/stdout JSON interface
    const proc = await execa("python3", [PYTHON_RUNNER], {
      input: JSON.stringify({ documentId, filePath, userId }),
      env: {
        ...process.env,
        PYTHONDONTWRITEBYTECODE: "1",
      },
      timeout: 300_000, // 5 minutes max for large PDFs
    });

    const parsed = ExtractionOutputSchema.safeParse(JSON.parse(proc.stdout));
    if (!parsed.success) {
      throw new Error(`Extraction output validation failed: ${parsed.error.message}`);
    }
    const result = parsed.data;

    if (result.status === "failed") {
      throw new Error(result.error ?? "Python pipeline returned failed status");
    }

    const processingTimeMs = Date.now() - startMs;
    const rawText = result.rawText ?? "";
    const contentHash = createHash("sha256").update(rawText).digest("hex");

    // Save extraction to DB with provenance fields (v1.1.0)
    await db.insert(extractions).values({
      documentId,
      rawText,
      tablesCount: result.tablesCount ?? 0,
      extractionMethod: result.extractionMethod ?? "pdfplumber",
      contentJson: result.contentJson ?? {},
      fileHash: pdfHash ?? result.fileHash ?? null,
      contentHash,
      processingTimeMs,
    });

    // Update document status + page count
    await db
      .update(documents)
      .set({ status: "completed", pages: result.pageCount ?? null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    logger.info(
      { documentId, processingTimeMs, pages: result.pageCount, fileHash: pdfHash },
      "PDF extraction complete",
    );
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    logger.error({ err, documentId, latencyMs }, "PDF extraction failed");

    await db
      .update(documents)
      .set({ status: "failed", errorMessage: (err as Error).message, updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  }
}

/** Trigger.dev task */
export const pdfTask = schemaTask({
  id: "pdf-extraction",
  schema: PdfPayloadSchema,
  maxDuration: 360, // 6 minutes — generous for large PDFs (python timeout is 5min)
  machine: { preset: "medium-1x" }, // 2 vCPU, 4GB RAM — needed for pdfplumber
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    await runPdfJob(payload);
    return { documentId: payload.documentId };
  },
});
