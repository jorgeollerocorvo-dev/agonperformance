import { auth } from "@/auth";
import { JORGE_EMAIL } from "@/lib/jorge";
import { prisma } from "@/lib/prisma";

export async function isStudioOwner(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id || session.user.email?.toLowerCase() !== JORGE_EMAIL) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, isBanned: true },
  });
  return !!user && !user.isBanned && user.email?.toLowerCase() === JORGE_EMAIL;
}
