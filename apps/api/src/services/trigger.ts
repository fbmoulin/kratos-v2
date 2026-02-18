import { tasks } from "@trigger.dev/sdk/v3";

export interface PdfJob {
  documentId: string;
  userId: string;
  filePath: string;
  fileName: string;
}

export interface DocxJob {
  documentId: string;
  userId: string;
  fileName: string;
}

export interface AnalysisJob {
  documentId: string;
  userId: string;
  extractionId: string;
  rawText: string;
}

export const triggerService = {
  async enqueuePdfExtraction(job: PdfJob): Promise<void> {
    await tasks.trigger("pdf-extraction", job);
  },

  async enqueueDocxExport(job: DocxJob): Promise<void> {
    await tasks.trigger("docx-export", job);
  },

  async enqueueAnalysis(job: AnalysisJob): Promise<void> {
    await tasks.trigger("analysis-job", job);
  },
};
