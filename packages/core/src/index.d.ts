export declare enum DocumentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare enum UserRole {
    ADMIN = "admin",
    LAWYER = "lawyer",
    REVIEWER = "reviewer"
}
export declare enum LegalMatter {
    CIVIL = "civil",
    CRIMINAL = "criminal",
    LABOR = "labor",
    TAX = "tax"
}
export declare enum ReviewAction {
    APPROVED = "approved",
    REVISED = "revised",
    REJECTED = "rejected"
}
export declare enum AIModel {
    GEMINI_FLASH = "gemini-2.5-flash",
    CLAUDE_SONNET = "claude-sonnet-4",
    CLAUDE_OPUS = "claude-opus-4"
}
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
export declare const APP_NAME = "KRATOS v2";
export declare const APP_VERSION = "2.0.0";
export declare const CACHE_TTL: {
    readonly EXTRACTION: number;
    readonly OCR: number;
    readonly FEW_SHOT: number;
};
export declare const RATE_LIMITS: {
    readonly UPLOAD_PER_MINUTE: 10;
    readonly ANALYSIS_PER_MINUTE: 5;
    readonly EXPORT_PER_MINUTE: 20;
};
export declare const SLA: {
    readonly PDF_PROCESSING_TARGET_MS: 30000;
    readonly PDF_PROCESSING_PERCENTILE: 0.95;
};
//# sourceMappingURL=index.d.ts.map