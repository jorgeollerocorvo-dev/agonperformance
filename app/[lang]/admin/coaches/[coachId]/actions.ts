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

    // Try to create user account linked to the athlete
    let user = await prisma.user.create({
      data: {
        email: athlete.email,
        displayName: athlete.displayName || athlete.fullName,
        passwordHash: hashedPassword,
        isEmailVerified: true, // Jorge created it, so we verify automatically
      },
    });

    // Link the athlete to the user
    await prisma.athlete.update({
      where: { id: athleteId },
      data: { userId: user.id },
    });

    // Create AthleteLink so the athlete can access their profile
    await prisma.athleteLink.create({
      data: {
        userId: user.id,
        athleteId: athleteId,
        active: true,
      },
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

        // Link the athlete to the existing user AND update password
        await prisma.athlete.update({
          where: { id: athleteId },
          data: { userId: existingUser.id },
        });

        // Always update the password (whether user had one or not)
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { passwordHash: hashedPassword },
        });

        // Create or update AthleteLink so the athlete can access their profile
        await prisma.athleteLink.upsert({
          where: { userId_athleteId: { userId: existingUser.id, athleteId } },
          update: { active: true },
          create: { userId: existingUser.id, athleteId, active: true },
        });

        return { success: true, password: initialPassword };
      }

      return { error: "An account with this email already exists but could not be linked" };
    }
    return { error: errorMessage };
  }
}
