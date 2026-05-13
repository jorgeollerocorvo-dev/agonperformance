"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isJorge } from "@/lib/jorge";
import { redirect } from "next/navigation";

// Update product
export async function updateProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const productId = String(formData.get("productId") ?? "");
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

  await prisma.catalogProduct.update({
    where: { id: productId },
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

  // Revalidate and redirect
  redirect(`/en/admin/catalog/${productId}`);
}

// Delete product
export async function deleteProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const productId = String(formData.get("productId") ?? "");

  await prisma.catalogProduct.delete({
    where: { id: productId },
  });

  redirect("/en/admin/catalog");
}

// Create variant
export async function createVariant(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const productId = String(formData.get("productId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim() || null;
  const size = String(formData.get("size") ?? "").trim() || null;
  const stock = parseInt(String(formData.get("stock") ?? "0"), 10) || 0;
  const sku = String(formData.get("sku") ?? "").trim();

  if (!name || !sku) {
    throw new Error("Missing required fields");
  }

  await prisma.catalogProductVariant.create({
    data: {
      productId,
      name,
      colorHex,
      size,
      stock,
      sku,
    },
  });

  redirect(`/en/admin/catalog/${productId}`);
}

// Update variant
export async function updateVariant(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const variantId = String(formData.get("variantId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim() || null;
  const size = String(formData.get("size") ?? "").trim() || null;
  const stock = parseInt(String(formData.get("stock") ?? "0"), 10) || 0;
  const sku = String(formData.get("sku") ?? "").trim();

  if (!name || !sku) {
    throw new Error("Missing required fields");
  }

  const variant = await prisma.catalogProductVariant.update({
    where: { id: variantId },
    data: {
      name,
      colorHex,
      size,
      stock,
      sku,
    },
  });

  redirect(`/en/admin/catalog/${variant.productId}/${variant.id}`);
}

// Delete variant
export async function deleteVariant(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const variantId = String(formData.get("variantId") ?? "");
  const variant = await prisma.catalogProductVariant.findUnique({
    where: { id: variantId },
  });

  if (!variant) throw new Error("Variant not found");

  await prisma.catalogProductVariant.delete({
    where: { id: variantId },
  });

  redirect(`/en/admin/catalog/${variant.productId}`);
}

// Add image
export async function addImage(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const productId = String(formData.get("productId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const altText = String(formData.get("altText") ?? "").trim() || null;

  if (!imageUrl) {
    throw new Error("Image URL is required");
  }

  await prisma.catalogProductImage.create({
    data: {
      productId,
      imageUrl,
      altText,
    },
  });

  redirect(`/en/admin/catalog/${productId}`);
}

// Delete image
export async function deleteImage(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const imageId = String(formData.get("imageId") ?? "");
  const image = await prisma.catalogProductImage.findUnique({
    where: { id: imageId },
  });

  if (!image) throw new Error("Image not found");

  await prisma.catalogProductImage.delete({
    where: { id: imageId },
  });
}

// Add variant image
export async function addVariantImage(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const variantId = String(formData.get("variantId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const altText = String(formData.get("altText") ?? "").trim() || null;

  if (!imageUrl) {
    throw new Error("Image URL is required");
  }

  const variant = await prisma.catalogProductVariant.findUnique({
    where: { id: variantId },
    select: { productId: true },
  });

  if (!variant) throw new Error("Variant not found");

  await prisma.catalogProductVariantImage.create({
    data: {
      variantId,
      imageUrl,
      altText,
    },
  });

  redirect(`/en/admin/catalog/${variant.productId}/${variantId}`);
}

// Delete variant image
export async function deleteVariantImage(formData: FormData) {
  const session = await auth();
  if (!session?.user || !isJorge(session)) {
    throw new Error("Unauthorized");
  }

  const imageId = String(formData.get("imageId") ?? "");
  const image = await prisma.catalogProductVariantImage.findUnique({
    where: { id: imageId },
  });

  if (!image) throw new Error("Image not found");

  await prisma.catalogProductVariantImage.delete({
    where: { id: imageId },
  });
}
