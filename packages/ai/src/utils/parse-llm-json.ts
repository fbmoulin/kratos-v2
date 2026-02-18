/**
 * Extracts and parses JSON from LLM output that may contain
 * markdown fences, preamble text, or thinking blocks.
 */
export function parseLlmJson<T = unknown>(raw: string): T {
  // Try direct parse first
  try { return JSON.parse(raw); } catch { /* continue */ }

  // Strip markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }

  // Extract first { ... } block
  const braceStart = raw.indexOf('{');
  const braceEnd = raw.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return JSON.parse(raw.slice(braceStart, braceEnd + 1));
  }

  throw new Error(`Cannot extract JSON from LLM output: ${raw.slice(0, 200)}`);
}
