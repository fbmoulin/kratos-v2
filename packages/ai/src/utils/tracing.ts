import type { RunnableConfig } from '@langchain/core/runnables';

export interface TracingContext {
  extractionId: string;
  documentId: string;
  userId: string;
}

/**
 * Builds a RunnableConfig with correlation metadata for LangSmith tracing.
 * When LANGCHAIN_TRACING_V2=true, this metadata appears on every trace.
 * When tracing is disabled, the config is silently ignored by LangChain.
 */
export function buildTracingConfig(
  nodeName: string,
  context: TracingContext,
  extra?: {
    model?: string;
    legalMatter?: string;
    complexity?: number;
    tags?: string[];
  },
): RunnableConfig {
  return {
    runName: `kratos-${nodeName}`,
    metadata: {
      extractionId: context.extractionId,
      documentId: context.documentId,
      userId: context.userId,
      node: nodeName,
      ...(extra?.model && { model: extra.model }),
      ...(extra?.legalMatter && { legalMatter: extra.legalMatter }),
      ...(extra?.complexity != null && { complexity: extra.complexity }),
    },
    tags: [
      'kratos-v2',
      nodeName,
      ...(extra?.legalMatter ? [extra.legalMatter] : []),
      ...(extra?.tags ?? []),
    ],
  };
}
