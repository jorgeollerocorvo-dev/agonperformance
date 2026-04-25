/**
 * Owner / sole-coach gating.
 *
 * For now, the "Leads" funnel is private to Jorge's account. Tab visibility,
 * private inbox, and the dedicated /find/jorge intake all key off this email.
 *
 * If we ever generalize this to per-coach private funnels, replace these
 * helpers with a check on `coachProfile.handle` instead.
 */
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export const JORGE_EMAIL = "jorge.ollero.corvo@gmail.com";
export const JORGE_INQUIRY_SOURCE = "jorge";
export const JORGE_HANDLE = "jorge";

export function isJorge(session: Session | null): boolean {
  return session?.user?.email === JORGE_EMAIL;
}

export async function findJorgeCoachProfileId(): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { email: JORGE_EMAIL },
    include: { coachProfile: true },
  });
  return u?.coachProfile?.id ?? null;
}
