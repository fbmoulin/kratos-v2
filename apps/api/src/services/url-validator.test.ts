import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateIngestionUrl } from './url-validator.js';

describe('validateIngestionUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts valid HTTPS URL', () => {
    const result = validateIngestionUrl('https://storage.googleapis.com/bucket/file.pdf');
    expect(result.valid).toBe(true);
  });

  it('rejects HTTP URL', () => {
    const result = validateIngestionUrl('http://example.com/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HTTPS');
  });

  it('rejects invalid URL format', () => {
    const result = validateIngestionUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid URL');
  });

  it('rejects localhost', () => {
    const result = validateIngestionUrl('https://localhost/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('localhost');
  });

  it('rejects 127.0.0.1', () => {
    const result = validateIngestionUrl('https://127.0.0.1/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private');
  });

  it('rejects 10.x.x.x private IPs', () => {
    const result = validateIngestionUrl('https://10.0.0.1/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private');
  });

  it('rejects 192.168.x.x private IPs', () => {
    const result = validateIngestionUrl('https://192.168.1.1/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private');
  });

  it('rejects 172.16-31.x.x private IPs', () => {
    const result = validateIngestionUrl('https://172.16.0.1/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private');
  });

  it('rejects URLs with embedded credentials', () => {
    const result = validateIngestionUrl('https://user:pass@example.com/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('credentials');
  });

  it('accepts URL when host is on allowlist', () => {
    vi.stubEnv('URL_INGESTION_ALLOWLIST', 'storage.googleapis.com,supabase.co');
    const result = validateIngestionUrl('https://storage.googleapis.com/bucket/file.pdf');
    expect(result.valid).toBe(true);
  });

  it('rejects URL when host is not on allowlist', () => {
    vi.stubEnv('URL_INGESTION_ALLOWLIST', 'storage.googleapis.com');
    const result = validateIngestionUrl('https://evil.com/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not on the URL ingestion allowlist');
  });

  it('allows subdomain matching on allowlist', () => {
    vi.stubEnv('URL_INGESTION_ALLOWLIST', 'supabase.co');
    const result = validateIngestionUrl('https://abc.supabase.co/storage/v1/object/file.pdf');
    expect(result.valid).toBe(true);
  });

  it('accepts any non-private HTTPS URL when allowlist is empty', () => {
    vi.stubEnv('URL_INGESTION_ALLOWLIST', '');
    const result = validateIngestionUrl('https://any-domain.com/file.pdf');
    expect(result.valid).toBe(true);
  });

  it('rejects 0.0.0.0', () => {
    const result = validateIngestionUrl('https://0.0.0.0/file.pdf');
    expect(result.valid).toBe(false);
  });
});
