"use server";
import { revalidatePath } from "next/cache";
import { requireHqOwner } from "@/lib/agon-hq-owner";
import { runHqDraft, reviewHqDraft, setHqPaused, recoverHqDraft } from "@/lib/agon-hq";
export async function generateDraft() {
  await requireHqOwner();
  await runHqDraft(true);
  revalidatePath("/[lang]/admin/ai-studio", "page");
}
export async function pauseAutomation() {
  await requireHqOwner(); await setHqPaused(true);
  revalidatePath("/[lang]/admin/ai-studio", "page");
}
export async function resumeAutomation() {
  await requireHqOwner(); await setHqPaused(false);
  revalidatePath("/[lang]/admin/ai-studio", "page");
}
export async function reviewDraft(form: FormData) {
  await requireHqOwner();
  const status = form.get("status");
  if (status !== "approved" && status !== "rejected") return;
  await reviewHqDraft(String(form.get("key") || ""), status);
  revalidatePath("/[lang]/admin/ai-studio", "page");
}

export async function recoverDraft(form: FormData) {
  await requireHqOwner();
  await recoverHqDraft(String(form.get("key") || ""));
  revalidatePath("/[lang]/admin/ai-studio", "page");
}
