// @kratos/core - Tipos e constantes compartilhadas
// ============================================================
// Enums
// ============================================================
export var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING"] = "pending";
    DocumentStatus["PROCESSING"] = "processing";
    DocumentStatus["COMPLETED"] = "completed";
    DocumentStatus["FAILED"] = "failed";
})(DocumentStatus || (DocumentStatus = {}));
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["LAWYER"] = "lawyer";
    UserRole["REVIEWER"] = "reviewer";
})(UserRole || (UserRole = {}));
export var LegalMatter;
(function (LegalMatter) {
    LegalMatter["CIVIL"] = "civil";
    LegalMatter["CRIMINAL"] = "criminal";
    LegalMatter["LABOR"] = "labor";
    LegalMatter["TAX"] = "tax";
})(LegalMatter || (LegalMatter = {}));
export var ReviewAction;
(function (ReviewAction) {
    ReviewAction["APPROVED"] = "approved";
    ReviewAction["REVISED"] = "revised";
    ReviewAction["REJECTED"] = "rejected";
})(ReviewAction || (ReviewAction = {}));
export var AIModel;
(function (AIModel) {
    AIModel["GEMINI_FLASH"] = "gemini-2.5-flash";
    AIModel["CLAUDE_SONNET"] = "claude-sonnet-4";
    AIModel["CLAUDE_OPUS"] = "claude-opus-4";
})(AIModel || (AIModel = {}));
// ============================================================
// Constants
// ============================================================
export const APP_NAME = 'KRATOS v2';
export const APP_VERSION = '2.0.0';
export const CACHE_TTL = {
    EXTRACTION: 7 * 24 * 60 * 60, // 7 dias em segundos
    OCR: 30 * 24 * 60 * 60, // 30 dias em segundos
    FEW_SHOT: 24 * 60 * 60, // 24 horas em segundos
};
export const RATE_LIMITS = {
    UPLOAD_PER_MINUTE: 10,
    ANALYSIS_PER_MINUTE: 5,
    EXPORT_PER_MINUTE: 20,
};
export const SLA = {
    PDF_PROCESSING_TARGET_MS: 30_000, // 30 segundos
    PDF_PROCESSING_PERCENTILE: 0.95, // 95% dos PDFs
};
//# sourceMappingURL=index.js.map