"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isJorge } from "@/lib/jorge";

/**
 * Admin-only (Jorge) CRUD for landing-page testimonials. Not tied to any
 * coach's Review flow — these are curated App-level testimonials.
 */
async function assertJorge() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  if (!isJorge(session)) throw new Error("forbidden");
}

export async function createTestimonial(formData: FormData) {
  await assertJorge();
  const num = (name: string, def: number): number => {
    const v = parseInt(String(formData.get(name) ?? ""), 10);
    return isNaN(v) ? def : v;
  };
  const str = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v || null;
  };
  const count = await prisma.appTestimonial.count();
  await prisma.appTestimonial.create({
    data: {
      quoteAr: str("quoteAr"),
      quoteEn: str("quoteEn"),
      quoteEs: str("quoteEs"),
      rating: Math.max(1, Math.min(5, num("rating", 5))),
      clientName: str("clientName"),
      clientCity: str("clientCity"),
      clientRole: str("clientRole"),
      order: count,
      isPublished: true,
    },
  });
  revalidatePath("/[lang]/admin/testimonials", "page");
  revalidatePath("/[lang]", "page");
}

export async function updateTestimonial(formData: FormData) {
  await assertJorge();
  const id = String(formData.get("id") ?? "");
  const str = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v || null;
  };
  const num = (name: string, def: number): number => {
    const v = parseInt(String(formData.get(name) ?? ""), 10);
    return isNaN(v) ? def : v;
  };
  await prisma.appTestimonial.update({
    where: { id },
    data: {
      quoteAr: str("quoteAr"),
      quoteEn: str("quoteEn"),
      quoteEs: str("quoteEs"),
      rating: Math.max(1, Math.min(5, num("rating", 5))),
      clientName: str("clientName"),
      clientCity: str("clientCity"),
      clientRole: str("clientRole"),
      isPublished: formData.get("isPublished") === "on",
    },
  });
  revalidatePath("/[lang]/admin/testimonials", "page");
  revalidatePath("/[lang]", "page");
}

export async function deleteTestimonial(formData: FormData) {
  await assertJorge();
  const id = String(formData.get("id") ?? "");
  await prisma.appTestimonial.delete({ where: { id } });
  revalidatePath("/[lang]/admin/testimonials", "page");
  revalidatePath("/[lang]", "page");
}
