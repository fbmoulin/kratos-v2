/**
 * @module @kratos/core
 * Shared types, enums, and constants for the KRATOS v2 platform.
 *
 * This package is a pure TypeScript module with zero external dependencies.
 * All other packages (`@kratos/api`, `@kratos/db`, `@kratos/ai`, `@kratos/web`)
 * import from here to ensure consistent type definitions across the stack.
 *
 * @example
 * import { DocumentStatus, APP_NAME, type Document } from '@kratos/core';
 */

// ============================================================
// Enums
// ============================================================

/** Document processing lifecycle stages. */
export enum DocumentStatus {
  /** Uploaded, awaiting extraction */
  PENDING = 'pending',
  /** PDF pipeline actively extracting content */
  PROCESSING = 'processing',
  /** Extraction and analysis finished successfully */
  COMPLETED = 'completed',
  /** Processing encountered an unrecoverable error */
  FAILED = 'failed',
}

/** User roles for RBAC (Role-Based Access Control). */
export enum UserRole {
  /** Full system access, manage users and settings */
  ADMIN = 'admin',
  /** Upload documents, review analyses, export drafts */
  LAWYER = 'lawyer',
  /** Review-only access for quality assurance */
  REVIEWER = 'reviewer',
}

/** Legal domain categories for document classification and agent routing. */
export enum LegalMatter {
  CIVIL = 'civil',
  CRIMINAL = 'criminal',
  LABOR = 'labor',
  TAX = 'tax',
}

/** Actions available in the Human-in-the-Loop review step. */
export enum ReviewAction {
  /** Analysis accepted as-is */
  APPROVED = 'approved',
  /** Analysis modified by reviewer */
  REVISED = 'revised',
  /** Analysis rejected — requires re-analysis */
  REJECTED = 'rejected',
}

/** AI model identifiers used for analysis and routing. */
export enum AIModel {
  /** Google Gemini 2.5 Flash — fast, cost-effective for extraction + OCR */
  GEMINI_FLASH = 'gemini-2.5-flash',
  /** Anthropic Claude Sonnet 4 — balanced for standard legal analysis */
  CLAUDE_SONNET = 'claude-sonnet-4',
  /** Anthropic Claude Opus 4 — highest quality for complex cases */
  CLAUDE_OPUS = 'claude-opus-4',
}

// ============================================================
// Types
// ============================================================

/** A judicial PDF document uploaded for processing. */
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

/** Structured content extracted from a PDF by the extraction pipeline. */
export interface Extraction {
  id: string;
  documentId: string;
  contentJson: Record<string, unknown>;
  extractionMethod: string;
  createdAt: Date;
}

/** AI-generated legal analysis result from the LangGraph agent chain. */
export interface Analysis {
  id: string;
  extractionId: string;
  agentChain: string;
  reasoningTrace: string;
  resultJson: Record<string, unknown>;
  modelUsed: AIModel;
  createdAt: Date;
}

/** Immutable audit log entry for compliance tracking (CNJ 615/2025). */
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

/** Legal precedent stored in the RAG knowledge base with vector embedding. */
export interface Precedent {
  id: string;
  content: string;
  /** 1536-dimensional vector from OpenAI text-embedding-3-small */
  embedding: number[];
  metadata: Record<string, unknown>;
  category: LegalMatter;
}

/** Versioned prompt template for AI agent instructions. */
export interface PromptVersion {
  id: string;
  promptKey: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * FIRAC framework result — the core output of legal AI analysis.
 * Facts, Issue, Rule, Analysis, Conclusion.
 */
export interface FIRACResult {
  facts: string;
  issue: string;
  rule: string;
  analysis: string;
  conclusion: string;
}

/** Payload submitted during Human-in-the-Loop review. */
export interface ReviewPayload {
  action: ReviewAction;
  comments: string;
  /** Only present when action is `REVISED` */
  revisedContent?: Record<string, unknown>;
}

// ============================================================
// Phase 2 — AI Orchestration Types
// ============================================================

/** Decision type classification for judicial documents. */
export enum DecisionType {
  /** Provisional injunctive relief */
  LIMINAR = 'liminar',
  /** Final judgment on merits */
  SENTENCA = 'sentenca',
  /** Procedural order (non-substantive) */
  DESPACHO = 'despacho',
  /** Appellate court decision */
  ACORDAO = 'acordao',
}

/** Result from the router agent: classification + model selection. */
export interface RouterResult {
  legalMatter: LegalMatter;
  decisionType: DecisionType;
  complexity: number;
  confidence: number;
  selectedModel: AIModel;
  reasoning: string;
}

/** Combined RAG context from vector + graph search with RRF fusion. */
export interface RAGContext {
  vectorResults: Array<{ content: string; score: number; source: string }>;
  graphResults: Array<{ content: string; score: number; path: string[] }>;
  fusedResults: Array<{ content: string; score: number; source: string }>;
}

// ============================================================
// Constants
// ============================================================

export const APP_NAME = 'KRATOS v2';
export const APP_VERSION = '2.5.0';

/** Cache TTL values in seconds for Redis/CDN caching strategies. */
export const CACHE_TTL = {
  /** Extraction results: 7 days */
  EXTRACTION: 7 * 24 * 60 * 60,
  /** OCR results: 30 days */
  OCR: 30 * 24 * 60 * 60,
  /** Few-shot examples: 24 hours */
  FEW_SHOT: 24 * 60 * 60,
} as const;

/** Per-user rate limits (requests per minute) by operation type. */
export const RATE_LIMITS = {
  UPLOAD_PER_MINUTE: 10,
  ANALYSIS_PER_MINUTE: 5,
  EXPORT_PER_MINUTE: 20,
} as const;

/** Service Level Agreement targets for PDF processing performance. */
export const SLA = {
  /** Target processing time: 30 seconds */
  PDF_PROCESSING_TARGET_MS: 30_000,
  /** 95th percentile of PDFs must meet the target */
  PDF_PROCESSING_PERCENTILE: 0.95,
} as const;
