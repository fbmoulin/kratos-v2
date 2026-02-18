import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, extractions, documents } from "@kratos/db";
import { eq } from "drizzle-orm";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_RUNNER = path.join(__dirname, "pdf_runner.py");

export const PdfPayloadSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
});

export type PdfPayload = z.infer<typeof PdfPayloadSchema>;

interface PythonResult {
  status: "completed" | "failed";
  rawText?: string;
  tablesCount?: number;
  pageCount?: number;
  extractionMethod?: string;
  contentJson?: Record<string, unknown>;
  error?: string;
}

/** Pure function — testable without Trigger.dev runtime */
export async function runPdfJob(payload: PdfPayload): Promise<void> {
  const { documentId, userId, filePath } = payload;
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

    const result: PythonResult = JSON.parse(proc.stdout);

    if (result.status === "failed") {
      throw new Error(result.error ?? "Python pipeline returned failed status");
    }

    // Save extraction to DB
    await db.insert(extractions).values({
      documentId,
      rawText: result.rawText ?? "",
      tablesCount: result.tablesCount ?? 0,
      extractionMethod: result.extractionMethod ?? "pdfplumber",
      contentJson: result.contentJson ?? {},
    });

    // Update document status + page count
    await db
      .update(documents)
      .set({ status: "completed", pages: result.pageCount ?? null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    const latencyMs = Date.now() - startMs;
    logger.info({ documentId, latencyMs, pages: result.pageCount }, "PDF extraction complete");
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
