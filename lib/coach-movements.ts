import { prisma } from "./prisma";
import type { Movement, CoachMovement } from "@prisma/client";

type SearchResult = (Movement | CoachMovement) & { _type?: "global" | "coach" };

/**
 * Search movements for a coach with hybrid strategy:
 * 1. First check coach-specific movements (highest priority)
 * 2. Then check global Movement library (fallback)
 * 3. Return combined results, prioritizing coach's customs
 *
 * This allows coaches to create custom movements while still accessing
 * the global library. Coach customizations take precedence.
 */
export async function searchMovementsForCoach(
  coachProfileId: string,
  query: string
): Promise<SearchResult[]> {
  // Search coach-specific movements first
  const coachMovements = (await prisma.coachMovement.findMany({
    where: {
      coachProfileId,
      isActive: true,
      OR: [
        { nameEn: { contains: query, mode: "insensitive" } },
        { nameEs: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ],
    },
  })) as SearchResult[];

  coachMovements.forEach((m) => {
    m._type = "coach";
  });

  // Search global library
  const globalMovements = (await prisma.movement.findMany({
    where: {
      isActive: true,
      OR: [
        { nameEn: { contains: query, mode: "insensitive" } },
        { nameEs: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ],
    },
  })) as SearchResult[];

  globalMovements.forEach((m) => {
    m._type = "global";
  });

  // Return coach's customs first, then global
  // Remove duplicates (same code) - prefer coach version
  const coachCodes = new Set(coachMovements.map((m) => m.code));
  const uniqueGlobal = globalMovements.filter((m) => !coachCodes.has(m.code));

  return [...coachMovements, ...uniqueGlobal];
}

/**
 * Get a single movement for a coach, checking both coach-specific and global.
 * Returns the coach's custom version if it exists, otherwise the global version.
 */
export async function getMovementForCoach(
  coachProfileId: string,
  code: string
): Promise<SearchResult | null> {
  // Check coach-specific first
  const coachMovement = await prisma.coachMovement.findUnique({
    where: {
      coachProfileId_code: {
        coachProfileId,
        code,
      },
    },
  });

  if (coachMovement) {
    return { ...coachMovement, _type: "coach" } as SearchResult;
  }

  // Fall back to global
  const globalMovement = await prisma.movement.findUnique({
    where: { code },
  });

  if (globalMovement) {
    return { ...globalMovement, _type: "global" } as SearchResult;
  }

  return null;
}

/**
 * Create a coach-specific movement.
 * Generates code from English name (lowercase, spaces → underscores)
 */
export async function createCoachMovement(
  coachProfileId: string,
  nameEn: string,
  nameEs?: string | null,
  nameAr?: string | null,
  videoUrl?: string | null,
  category?: string | null
): Promise<CoachMovement> {
  // Generate code from English name
  const code = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");

  return prisma.coachMovement.create({
    data: {
      coachProfileId,
      code,
      nameEn,
      nameEs: nameEs ?? undefined,
      nameAr: nameAr ?? undefined,
      videoUrl: videoUrl ?? undefined,
      category: category ?? undefined,
      isActive: true,
    },
  });
}

/**
 * Update a coach's custom movement video URL.
 * Only works for coach-specific movements.
 */
export async function updateCoachMovementVideo(
  coachProfileId: string,
  code: string,
  videoUrl: string
): Promise<CoachMovement> {
  return prisma.coachMovement.update({
    where: {
      coachProfileId_code: {
        coachProfileId,
        code,
      },
    },
    data: {
      videoUrl,
    },
  });
}

/**
 * Get the video URL for a movement (coach custom or global).
 * Returns the coach's custom URL if set, otherwise the global URL.
 */
export async function getMovementVideoUrl(
  coachProfileId: string,
  movementId: string
): Promise<string | null> {
  // First, resolve whether this is a coach or global movement
  // Check coach movements by ID
  const coachMovement = await prisma.coachMovement.findUnique({
    where: { id: movementId },
  });

  if (coachMovement && coachMovement.coachProfileId === coachProfileId) {
    return coachMovement.videoUrl ?? null;
  }

  // Fall back to global movement
  const globalMovement = await prisma.movement.findUnique({
    where: { id: movementId },
  });

  return globalMovement?.videoUrl ?? null;
}
