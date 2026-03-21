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
 *
 * Provenance fields (v1.1.0): fileHash, contentHash, extractionMethod,
 * promptHash are included when provided for end-to-end observability.
 */
export function buildTracingConfig(
  nodeName: string,
  context: TracingContext,
  extra?: {
    model?: string;
    legalMatter?: string;
    complexity?: number;
    tags?: string[];
    /** Provenance: SHA-256 of the source PDF file */
    fileHash?: string;
    /** Provenance: SHA-256 of the extracted text */
    contentHash?: string;
    /** Provenance: extraction method used */
    extractionMethod?: string;
    /** Provenance: SHA-256 of the prompt used */
    promptHash?: string;
    /** Provenance: prompt key used */
    promptKey?: string;
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
      // Provenance fields for end-to-end observability
      ...(extra?.fileHash && { fileHash: extra.fileHash }),
      ...(extra?.contentHash && { contentHash: extra.contentHash }),
      ...(extra?.extractionMethod && { extractionMethod: extra.extractionMethod }),
      ...(extra?.promptHash && { promptHash: extra.promptHash }),
      ...(extra?.promptKey && { promptKey: extra.promptKey }),
    },
    tags: [
      'kratos-v2',
      nodeName,
      ...(extra?.legalMatter ? [extra.legalMatter] : []),
      ...(extra?.tags ?? []),
    ],
  };
}
