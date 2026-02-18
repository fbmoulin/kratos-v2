import { eq, desc } from 'drizzle-orm';
import { db, analyses } from '@kratos/db';

export const analysisRepo = {
  async create(data: {
    extractionId: string;
    agentChain: string;
    reasoningTrace?: string;
    resultJson: Record<string, unknown>;
    modelUsed: string;
    tokensInput?: number;
    tokensOutput?: number;
    latencyMs?: number;
  }) {
    const [analysis] = await db.insert(analyses).values({
      extractionId: data.extractionId,
      agentChain: data.agentChain,
      reasoningTrace: data.reasoningTrace ?? null,
      resultJson: data.resultJson,
      modelUsed: data.modelUsed,
      tokensInput: data.tokensInput ?? 0,
      tokensOutput: data.tokensOutput ?? 0,
      latencyMs: data.latencyMs ?? 0,
    }).returning();

    return analysis;
  },

  async getByExtractionId(extractionId: string) {
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.extractionId, extractionId))
      .orderBy(desc(analyses.createdAt))
      .limit(1);

    return analysis ?? null;
  },

  async updateResultJson(analysisId: string, resultJson: Record<string, unknown>) {
    const [analysis] = await db
      .update(analyses)
      .set({ resultJson })
      .where(eq(analyses.id, analysisId))
      .returning();

    return analysis ?? null;
  },
};
