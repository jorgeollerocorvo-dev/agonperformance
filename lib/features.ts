/**
 * Feature flags. Toggle by setting Railway env vars.
 *
 * Disabling AI import:
 *   railway variables --set "AI_IMPORT_ENABLED=false"
 *
 * Re-enable when an Anthropic API key is funded:
 *   railway variables --set "AI_IMPORT_ENABLED=true"
 */

export function aiImportEnabled(): boolean {
  // Default OFF until we explicitly turn it on. Avoids confusing users
  // with a button that fails because the Anthropic account is out of credits.
  return process.env.AI_IMPORT_ENABLED === "true";
}
