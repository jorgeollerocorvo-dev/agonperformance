import type { Session } from "next-auth";

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
