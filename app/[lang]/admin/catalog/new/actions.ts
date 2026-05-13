"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { redirect } from "next/navigation";

export async function createNewProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const nameEs = String(formData.get("nameEs") ?? "").trim() || null;
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim();
  const price = parseFloat(String(formData.get("price") ?? "0"));
  const sku = String(formData.get("sku") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  const featured = formData.get("featured") === "on";

  if (!nameEn || !category || !sku || price <= 0) {
    throw new Error("Missing required fields");
  }

  const product = await prisma.catalogProduct.create({
    data: {
      nameEn,
      nameEs,
      descriptionEn,
      category,
      price,
      sku,
      isActive,
      featured,
    },
  });

  redirect(`/en/admin/catalog/${product.id}`);
}
