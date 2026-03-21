import { z } from 'zod';

/**
 * Contract for prompt validation request.
 * Used to verify integrity of active prompts before critical operations.
 */
export const PromptValidationRequestSchema = z.object({
  /** The prompt key to validate (e.g. 'firac-enterprise') */
  promptKey: z.string().min(1),
  /** Optional: expected content hash to verify against */
  expectedHash: z.string().length(64).optional(),
});

export type PromptValidationRequest = z.infer<typeof PromptValidationRequestSchema>;

/**
 * Contract for prompt validation response.
 */
export const PromptValidationResponseSchema = z.object({
  valid: z.boolean(),
  promptKey: z.string(),
  activeVersion: z.number().nullable(),
  contentHash: z.string().nullable(),
  status: z.string().nullable(),
  message: z.string(),
});

export type PromptValidationResponse = z.infer<typeof PromptValidationResponseSchema>;
