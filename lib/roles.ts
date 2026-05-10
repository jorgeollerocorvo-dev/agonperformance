import type { Session } from "next-auth";
import { isCoachOwner as checkCoachOwner } from "./get-coach-profile";

export type AppRole = "CLIENT" | "COACH" | "ADMIN";

export function hasRole(session: Session | null, role: AppRole): boolean {
  return !!session?.user?.roles?.includes(role);
}

export function primaryRole(session: Session | null): AppRole | null {
  const roles = session?.user?.roles ?? [];
  if (roles.includes("COACH")) return "COACH";
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("CLIENT")) return "CLIENT";
  return null;
}

export function landingPathFor(locale: string, session: Session | null): string {
  const role = primaryRole(session);
  if (role === "COACH") return `/${locale}/coach`;
  if (role === "ADMIN") return `/${locale}/admin`;
  if (role === "CLIENT") return `/${locale}/athlete`;
  return `/${locale}`;
}

/**
 * Check if session user owns a specific coach profile.
 * Async version of isCoachOwner from get-coach-profile.ts
 * Used to verify resource ownership across coach-specific data.
 */
export async function isCoachOwner(
  session: Session | null,
  coachProfileId: string
): Promise<boolean> {
  return checkCoachOwner(session, coachProfileId);
}
