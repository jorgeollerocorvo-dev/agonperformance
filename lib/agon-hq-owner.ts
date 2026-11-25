import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JORGE_EMAIL } from "@/lib/jorge";
import { notFound } from "next/navigation";
export async function requireHqOwner() {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id || session?.user?.email !== JORGE_EMAIL) notFound();
  const user = await prisma.user.findUnique({ where: { id }, select: { email: true, isBanned: true } });
  if (!user || user.isBanned || user.email !== JORGE_EMAIL) notFound();
}
