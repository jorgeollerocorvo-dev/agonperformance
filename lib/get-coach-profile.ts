import { Session } from "next-auth";
import { prisma } from "./prisma";

/**
 * Fetch the coach profile for a user session.
 * Returns null if user is not authenticated or is not a coach.
 */
export async function getCoachProfile(session: Session | null) {
  if (!session?.user?.id) return null;

  return prisma.coachProfile.findUnique({
    where: { userId: session.user.id },
  });
}

/**
 * Assert that the session belongs to a coach.
 * Throws error if not a coach, returns the coach profile if valid.
 * Used in server actions to enforce coach-only access.
 */
export async function assertCoachAccess(session: Session | null) {
  const coach = await getCoachProfile(session);
  if (!coach) {
    throw new Error("Forbidden: not a coach");
  }
  return coach;
}

/**
 * Check if a session belongs to a specific coach.
 * Useful for verifying resource ownership.
 */
export async function isCoachOwner(
  session: Session | null,
  coachProfileId: string
): Promise<boolean> {
  const coach = await getCoachProfile(session);
  return coach?.id === coachProfileId;
}
