import { signOut } from "@/auth";

export async function POST() {
  await signOut({ redirect: false });
  return Response.json({ success: true });
}
