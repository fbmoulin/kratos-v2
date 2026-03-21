import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createAnalysisWorkflow, createInitialState, buildTracingConfig, resolvePromptWithMetadata, PROMPT_KEYS } from "@kratos/ai";
import { db, analyses, documents } from "@kratos/db";
import { eq } from "drizzle-orm";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

export const AnalysisPayloadSchema = z.object({
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  extractionId: z.string().uuid(),
  rawText: z.string().min(10),
});

export type AnalysisPayload = z.infer<typeof AnalysisPayloadSchema>;

/** Pure function — testable without Trigger.dev runtime */
export async function runAnalysisJob(payload: AnalysisPayload): Promise<void> {
  const startMs = Date.now();
  const { documentId, userId, extractionId, rawText } = payload;

  try {
    // Resolve prompt metadata for governance audit trail
    const promptMeta = await resolvePromptWithMetadata(
      PROMPT_KEYS.FIRAC_ENTERPRISE,
      '', // fallback not used in prod — resolver throws on failure
    ).catch(() => null);

    const workflow = createAnalysisWorkflow();
    const initialState = createInitialState({ extractionId, documentId, userId, rawText });
    const tracingConfig = buildTracingConfig('analysis-pipeline', {
      extractionId,
      documentId,
      userId,
    });

    const finalState = await workflow.invoke(initialState, tracingConfig);
    const latencyMs = Date.now() - startMs;

    await db.insert(analyses).values({
      extractionId,
      agentChain: "supervisor→router→rag→specialist→drafter",
      reasoningTrace: finalState.routerResult?.reasoning ?? null,
      resultJson: {
        firacResult: finalState.firacResult,
        draftResult: finalState.draftResult,
        routerResult: finalState.routerResult,
      },
      modelUsed: finalState.modelUsed ?? "unknown",
      tokensInput: finalState.tokensInput ?? 0,
      tokensOutput: finalState.tokensOutput ?? 0,
      latencyMs,
      // Prompt governance: record which prompt was used
      promptKey: promptMeta?.promptKey ?? null,
      promptVersion: promptMeta?.version ?? null,
      promptHash: promptMeta?.contentHash ?? null,
    });

    await db
      .update(documents)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    logger.info(
      {
        documentId, latencyMs, model: finalState.modelUsed,
        promptKey: promptMeta?.promptKey, promptVersion: promptMeta?.version,
      },
      "Analysis complete",
    );
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    logger.error({ err, documentId, latencyMs }, "Analysis failed");

    await db
      .update(documents)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  }
}

/** Trigger.dev task — wraps runAnalysisJob with no time limits */
export const analysisTask = schemaTask({
  id: "analysis-job",
  schema: AnalysisPayloadSchema,
  maxDuration: 600, // 10 minutes max (4.5 min pipeline + buffer)
  machine: { preset: "medium-1x" }, // 2 vCPU, 4GB RAM — sufficient for LangGraph
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    await runAnalysisJob(payload);
    return { documentId: payload.documentId, status: "completed" };
  },
});
