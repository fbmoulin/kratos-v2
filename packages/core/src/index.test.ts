import { describe, test, expect } from 'vitest';
import {
  DocumentStatus,
  UserRole,
  LegalMatter,
  ReviewAction,
  AIModel,
  APP_NAME,
  APP_VERSION,
  CACHE_TTL,
  RATE_LIMITS,
  SLA,
} from './index.js';

describe('@kratos/core enums', () => {
  test('DocumentStatus has correct values', () => {
    expect(DocumentStatus.PENDING).toBe('pending');
    expect(DocumentStatus.PROCESSING).toBe('processing');
    expect(DocumentStatus.COMPLETED).toBe('completed');
    expect(DocumentStatus.FAILED).toBe('failed');
  });

  test('UserRole has correct values', () => {
    expect(UserRole.ADMIN).toBe('admin');
    expect(UserRole.LAWYER).toBe('lawyer');
    expect(UserRole.REVIEWER).toBe('reviewer');
  });

  test('LegalMatter has correct values', () => {
    expect(LegalMatter.CIVIL).toBe('civil');
    expect(LegalMatter.CRIMINAL).toBe('criminal');
    expect(LegalMatter.LABOR).toBe('labor');
    expect(LegalMatter.TAX).toBe('tax');
  });

  test('ReviewAction has correct values', () => {
    expect(ReviewAction.APPROVED).toBe('approved');
    expect(ReviewAction.REVISED).toBe('revised');
    expect(ReviewAction.REJECTED).toBe('rejected');
  });

  test('AIModel has correct values', () => {
    expect(AIModel.GEMINI_FLASH).toBe('gemini-2.5-flash');
    expect(AIModel.CLAUDE_SONNET).toBe('claude-sonnet-4');
    expect(AIModel.CLAUDE_OPUS).toBe('claude-opus-4');
  });
});

describe('@kratos/core constants', () => {
  test('APP_NAME and APP_VERSION are correct', () => {
    expect(APP_NAME).toBe('KRATOS v2');
    expect(APP_VERSION).toBe('2.5.0');
  });

  test('CACHE_TTL values are positive numbers', () => {
    expect(CACHE_TTL.EXTRACTION).toBeGreaterThan(0);
    expect(CACHE_TTL.OCR).toBeGreaterThan(0);
    expect(CACHE_TTL.FEW_SHOT).toBeGreaterThan(0);
  });

  test('RATE_LIMITS values are positive', () => {
    expect(RATE_LIMITS.UPLOAD_PER_MINUTE).toBe(10);
    expect(RATE_LIMITS.ANALYSIS_PER_MINUTE).toBe(5);
    expect(RATE_LIMITS.EXPORT_PER_MINUTE).toBe(20);
  });

  test('SLA targets are defined', () => {
    expect(SLA.PDF_PROCESSING_TARGET_MS).toBe(30_000);
    expect(SLA.PDF_PROCESSING_PERCENTILE).toBe(0.95);
  });
});
