import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db, analyses, documents, extractions, auditLogs } from "@kratos/db";
import { buildDocxBuffer } from "@kratos/tools";
import { desc, eq } from "drizzle-orm";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCX_BUCKET = process.env.SUPABASE_DOCX_BUCKET || "documents";

export const DocxPayloadSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  fileName: z.string().min(1),
});

export type DocxPayload = z.infer<typeof DocxPayloadSchema>;

function pickDraft(resultJson: Record<string, unknown> | null | undefined): string {
  if (!resultJson) return "";
  const p = resultJson as Record<string, unknown>;
  return (
    (p.reviewedDraft as string) ||
    ((p.revisedContent as Record<string, unknown>)?.draft as string) ||
    (p.draft as string) ||
    (p.draftResult as string) ||
    ""
  );
}

/** Pure function — testable without Trigger.dev runtime */
export async function runDocxJob(payload: DocxPayload, supabase?: SupabaseClient): Promise<void> {
  const client =
    supabase ??
    createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

  const { documentId, userId, fileName } = payload;

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc || doc.userId !== userId || doc.status !== "reviewed") {
    logger.warn({ documentId }, "DOCX job skipped: doc missing, wrong user, or not reviewed");
    return;
  }

  const [extraction] = await db.select().from(extractions).where(eq(extractions.documentId, documentId)).limit(1);
  if (!extraction) {
    logger.warn({ documentId }, "DOCX job: extraction not found");
    return;
  }

  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.extractionId, extraction.id))
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  if (!analysis) {
    logger.warn({ documentId }, "DOCX job: analysis not found");
    return;
  }

  const draft = pickDraft(analysis.resultJson as Record<string, unknown>);
  if (!draft) {
    logger.warn({ documentId }, "DOCX job: no draft content");
    return;
  }

  const title = doc.fileName.replace(/\.pdf$/i, "");
  const buffer = await buildDocxBuffer(draft, { title });
  const path = `${userId}/${documentId}/${fileName}`;

  const { error: uploadError } = await client.storage
    .from(DOCX_BUCKET)
    .upload(path, buffer, { contentType: DOCX_MIME, upsert: true });

  if (uploadError) {
    await db.insert(auditLogs).values({
      entityType: 'document',
      entityId: documentId,
      action: 'export:failed',
      payloadAfter: { error: uploadError.message },
      userId,
    });
    throw new Error(`DOCX upload failed: ${uploadError.message}`);
  }

  await db.insert(auditLogs).values({
    entityType: 'document',
    entityId: documentId,
    action: 'export:completed',
    payloadAfter: { format: 'docx', path, fileName },
    userId,
  });

  logger.info({ documentId, path }, "DOCX export completed");
}

/** Trigger.dev task — wraps runDocxJob */
export const docxTask = schemaTask({
  id: "docx-export",
  schema: DocxPayloadSchema,
  maxDuration: 120, // 2 minutes — generous for DOCX generation
  machine: { preset: "small-1x" }, // 1 vCPU, 1GB RAM — lightweight I/O task
  retry: { maxAttempts: 3 },
  run: async (payload) => {
    await runDocxJob(payload);
    return { documentId: payload.documentId, fileName: payload.fileName };
  },
});
