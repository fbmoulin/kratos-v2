/**
 * URL validation for SSRF protection on the /v2/ingest endpoint.
 *
 * Validates that PDF download URLs are:
 * 1. On the allowlist (URL_INGESTION_ALLOWLIST env var)
 * 2. Not pointing to private/internal IPs
 * 3. Using HTTPS protocol
 */

import { URL } from 'node:url';
import { isIP } from 'node:net';

/** Private IP ranges that must be blocked (SSRF protection) */
const PRIVATE_RANGES = [
  /^127\./, // Loopback
  /^10\./, // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./, // Class C private
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 unique local
  /^fe80:/, // IPv6 link-local
  /^fd/, // IPv6 private
];

function isPrivateIp(hostname: string): boolean {
  if (!isIP(hostname)) return false;
  return PRIVATE_RANGES.some((range) => range.test(hostname));
}

function getAllowlist(): string[] {
  const raw = process.env.URL_INGESTION_ALLOWLIST ?? '';
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a URL for safe PDF ingestion.
 *
 * Checks performed:
 * - URL is parseable and uses HTTPS
 * - Hostname is on the allowlist (if configured)
 * - Hostname is not a private/internal IP
 * - No credentials in URL
 */
export function validateIngestionUrl(rawUrl: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed for PDF ingestion' };
  }

  // Block credentials in URL
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with embedded credentials are not allowed' };
  }

  // Block private IPs
  const hostname = parsed.hostname;
  if (isPrivateIp(hostname)) {
    return { valid: false, error: 'URLs pointing to private/internal IPs are not allowed' };
  }

  // Block localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]'
  ) {
    return { valid: false, error: 'URLs pointing to localhost are not allowed' };
  }

  // Allowlist check (if configured)
  const allowlist = getAllowlist();
  if (allowlist.length > 0) {
    const hostLower = hostname.toLowerCase();
    const isAllowed = allowlist.some(
      (allowed) => hostLower === allowed || hostLower.endsWith(`.${allowed}`),
    );
    if (!isAllowed) {
      return {
        valid: false,
        error: `Host "${hostname}" is not on the URL ingestion allowlist. Allowed: ${allowlist.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/** Fetch timeout configuration for PDF downloads */
export const FETCH_CONFIG = {
  /** Connection + download timeout in milliseconds */
  TIMEOUT_MS: 30_000,
  /** Maximum Content-Length header value (50MB) */
  MAX_CONTENT_LENGTH: 50 * 1024 * 1024,
} as const;
