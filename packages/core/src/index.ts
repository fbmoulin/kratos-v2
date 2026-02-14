// @kratos/core - Tipos e constantes compartilhadas

// ============================================================
// Enums
// ============================================================

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum UserRole {
  ADMIN = 'admin',
  LAWYER = 'lawyer',
  REVIEWER = 'reviewer',
}

export enum LegalMatter {
  CIVIL = 'civil',
  CRIMINAL = 'criminal',
  LABOR = 'labor',
  TAX = 'tax',
}

export enum ReviewAction {
  APPROVED = 'approved',
  REVISED = 'revised',
  REJECTED = 'rejected',
}

export enum AIModel {
  GEMINI_FLASH = 'gemini-2.5-flash',
  CLAUDE_SONNET = 'claude-sonnet-4',
  CLAUDE_OPUS = 'claude-opus-4',
}

// ============================================================
// Types
// ============================================================

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  status: DocumentStatus;
  pages: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Extraction {
  id: string;
  documentId: string;
  contentJson: Record<string, unknown>;
  extractionMethod: string;
  createdAt: Date;
}

export interface Analysis {
  id: string;
  extractionId: string;
  agentChain: string;
  reasoningTrace: string;
  resultJson: Record<string, unknown>;
  modelUsed: AIModel;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
  userId: string;
  createdAt: Date;
}

export interface Precedent {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  category: LegalMatter;
}

export interface PromptVersion {
  id: string;
  promptKey: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: Date;
}

export interface FIRACResult {
  facts: string;
  issue: string;
  rule: string;
  analysis: string;
  conclusion: string;
}

export interface ReviewPayload {
  action: ReviewAction;
  comments: string;
  revisedContent?: Record<string, unknown>;
}

// ============================================================
// Constants
// ============================================================

export const APP_NAME = 'KRATOS v2';
export const APP_VERSION = '2.0.0';

export const CACHE_TTL = {
  EXTRACTION: 7 * 24 * 60 * 60, // 7 dias em segundos
  OCR: 30 * 24 * 60 * 60, // 30 dias em segundos
  FEW_SHOT: 24 * 60 * 60, // 24 horas em segundos
} as const;

export const RATE_LIMITS = {
  UPLOAD_PER_MINUTE: 10,
  ANALYSIS_PER_MINUTE: 5,
  EXPORT_PER_MINUTE: 20,
} as const;

export const SLA = {
  PDF_PROCESSING_TARGET_MS: 30_000, // 30 segundos
  PDF_PROCESSING_PERCENTILE: 0.95, // 95% dos PDFs
} as const;
