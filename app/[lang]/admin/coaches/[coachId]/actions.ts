"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { hash } from "bcryptjs";

export async function updateAthleteProfile(
  formData: FormData,
  athleteId: string,
  lang: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    return { error: "Unauthorized" };
  }

  // Verify the athlete exists
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    include: { coachProfile: true },
  });

  if (!athlete) {
    return { error: "Athlete not found" };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").toLowerCase().trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const sex = String(formData.get("sex") ?? "").trim() || null;
  const age = formData.get("age") ? parseInt(String(formData.get("age")), 10) : null;
  const heightCm = formData.get("heightCm") ? parseInt(String(formData.get("heightCm")), 10) : null;
  const weightKg = formData.get("weightKg") ? parseFloat(String(formData.get("weightKg"))) : null;
  const division = String(formData.get("division") ?? "").trim() || null;
  const competitiveGoal = String(formData.get("competitiveGoal") ?? "").trim() || null;
  const goals = String(formData.get("goals") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!fullName) {
    return { error: "Full name is required" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Update athlete details
      await tx.athlete.update({
        where: { id: athleteId },
        data: {
          fullName,
          displayName,
          email,
          phone,
          sex: sex || null,
          age: age || null,
          heightCm: heightCm || null,
          weightKg: weightKg || null,
          division,
          competitiveGoal,
          goals,
          notes,
        },
      });

      // Update user details if athlete has a user account
      if (athlete.userId) {
        const updateData: any = {};
        if (displayName) updateData.displayName = displayName;
        if (email) updateData.email = email;

        if (Object.keys(updateData).length > 0) {
          await tx.user.update({
            where: { id: athlete.userId },
            data: updateData,
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function updateAthletePassword(
  athleteId: string,
  newPassword: string,
  lang: string
): Promise<{ error?: string; success?: boolean; password?: string }> {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    return { error: "Unauthorized" };
  }

  // Verify the athlete exists and has a user account
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });

  if (!athlete || !athlete.userId) {
    return { error: "Athlete not found or has no user account" };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  try {
    const hashedPassword = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: athlete.userId },
      data: { passwordHash: hashedPassword },
    });

    // Return the plain password once so Jorge can see/copy it
    return { success: true, password: newPassword };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function generateTemporaryPassword(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function createUserAccountForAthlete(
  athleteId: string,
  initialPassword: string,
  lang: string
): Promise<{ error?: string; success?: boolean; password?: string }> {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    return { error: "Unauthorized" };
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });

  if (!athlete) {
    return { error: "Athlete not found" };
  }

  if (athlete.userId) {
    return { error: "Athlete already has a user account" };
  }

  if (!athlete.email) {
    return { error: "Athlete must have an email address to create an account" };
  }

  if (!initialPassword || initialPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  try {
    const hashedPassword = await hash(initialPassword, 10);

    // Wrap the 3-step setup in a transaction — User creation, Athlete linking
    // and AthleteLink insertion must all succeed together, otherwise the
    // athlete ends up half-linked and can't see their workouts.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: athlete.email,
          displayName: athlete.displayName || athlete.fullName,
          passwordHash: hashedPassword,
          isEmailVerified: true, // Jorge created it, so we verify automatically
        },
      });
      await tx.athlete.update({
        where: { id: athleteId },
        data: { userId: user.id },
      });
      await tx.athleteLink.upsert({
        where: { userId_athleteId: { userId: user.id, athleteId } },
        create: { userId: user.id, athleteId, active: true },
        update: { active: true },
      });
    });

    return { success: true, password: initialPassword };
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes("Unique constraint failed on the fields: (`email`)")) {
      // Account already exists with this email - merge by linking the athlete to it
      const existingUser = await prisma.user.findUnique({
        where: { email: athlete.email },
      });

      if (existingUser) {
        const hashedPassword = await hash(initialPassword, 10);

        // Same transaction guarantee for the merge path: link athlete →
        // existing user, reset password, and ensure AthleteLink all together.
        await prisma.$transaction(async (tx) => {
          await tx.athlete.update({
            where: { id: athleteId },
            data: { userId: existingUser.id },
          });
          await tx.user.update({
            where: { id: existingUser.id },
            data: { passwordHash: hashedPassword },
          });
          await tx.athleteLink.upsert({
            where: { userId_athleteId: { userId: existingUser.id, athleteId } },
            update: { active: true },
            create: { userId: existingUser.id, athleteId, active: true },
          });
        });

        return { success: true, password: initialPassword };
      }

      return { error: "An account with this email already exists but could not be linked" };
    }
    return { error: errorMessage };
  }
}

/**
 * Reassign an athlete from one coach to another. Jorge-only.
 * The athlete's programs (owned via athleteId) come along automatically.
 * Redirects to the target coach's detail page so Jorge can confirm.
 */
export async function reassignAthleteToCoach(formData: FormData) {
  "use server";
  const athleteId = String(formData.get("athleteId") ?? "");
  const targetCoachProfileId = String(formData.get("targetCoachProfileId") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  const currentCoachId = String(formData.get("currentCoachId") ?? "");

  if (!athleteId || !targetCoachProfileId) {
    redirect(`/${lang}/admin/coaches/${currentCoachId}?reassignError=${encodeURIComponent("Missing fields")}`);
  }

  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    redirect(`/${lang}/admin/coaches/${currentCoachId}?reassignError=${encodeURIComponent("Forbidden")}`);
  }

  // Confirm the target coach exists
  const target = await prisma.coachProfile.findUnique({
    where: { id: targetCoachProfileId },
    include: { user: { select: { fullName: true, displayName: true } } },
  });
  if (!target) {
    redirect(`/${lang}/admin/coaches/${currentCoachId}?reassignError=${encodeURIComponent("Target coach not found")}`);
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { id: true, fullName: true, coachProfileId: true },
  });
  if (!athlete) {
    redirect(`/${lang}/admin/coaches/${currentCoachId}?reassignError=${encodeURIComponent("Athlete not found")}`);
  }

  if (athlete.coachProfileId === targetCoachProfileId) {
    redirect(`/${lang}/admin/coaches/${targetCoachProfileId}?reassignNoop=1`);
  }

  await prisma.athlete.update({
    where: { id: athleteId },
    data: { coachProfileId: targetCoachProfileId },
  });

  const targetName = target.user.displayName ?? target.user.fullName ?? "coach";
  redirect(
    `/${lang}/admin/coaches/${targetCoachProfileId}?reassigned=${encodeURIComponent(`${athlete.fullName} → ${targetName}`)}`,
  );
}
