"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function currentCoachUserId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.user.id }, select: { userId: true } });
  return coach?.userId ?? null;
}

export async function createTemplate(formData: FormData) {
  const coachUserId = await currentCoachUserId();
  if (!coachUserId) return;
  const label = String(formData.get("label") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!label || !body) return;
  const count = await prisma.messageTemplate.count({ where: { coachUserId } });
  await prisma.messageTemplate.create({
    data: { coachUserId, label, body, order: count },
  });
  revalidatePath("/[lang]/coach/templates", "page");
}

export async function deleteTemplate(formData: FormData) {
  const coachUserId = await currentCoachUserId();
  if (!coachUserId) return;
  const id = String(formData.get("id") ?? "");
  await prisma.messageTemplate.deleteMany({ where: { id, coachUserId } });
  revalidatePath("/[lang]/coach/templates", "page");
}
