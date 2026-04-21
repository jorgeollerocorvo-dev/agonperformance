export function clsx(...parts: (string | boolean | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
