/**
 * Feature flags. Default ON now — the AI chain (Gemini free → Groq free →
 * OpenAI paid → Anthropic paid) handles "no key configured" gracefully with a
 * clear error, so there's no reason to keep features gated behind an extra
 * opt-in. Set the env to "false" to force-disable.
 */

export function aiImportEnabled(): boolean {
  return process.env.AI_IMPORT_ENABLED !== "false";
}

/** AI program generation from a brief. Independent flag from import. */
export function aiProgramGenEnabled(): boolean {
  return process.env.AI_PROGRAM_GEN_ENABLED !== "false";
}
