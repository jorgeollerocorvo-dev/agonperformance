import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import Link from "next/link";
import { updateVariant, deleteVariant, deleteVariantImage, addVariantImage } from "../actions";

export default async function VariantDetailPage({
  params,
}: {
  params: Promise<{ lang: string; productId: string; variantId: string }>;
}) {
  const { lang, productId, variantId } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!isJorge(session)) notFound();

  const dict = await getDictionary(lang);

  const product = await prisma.catalogProduct.findUnique({
    where: { id: productId },
    select: { id: true, nameEn: true },
  });

  if (!product) notFound();

  const variant = await prisma.catalogProductVariant.findUnique({
    where: { id: variantId },
    include: { images: { orderBy: { order: "asc" } } },
  });

  if (!variant) notFound();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href={`/${lang}/admin/catalog/${product.id}`} className="text-[var(--primary)] hover:underline text-sm mb-2">
            ← Back to {product.nameEn}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3 mt-2">
            {variant.colorHex && (
              <div
                className="w-8 h-8 rounded-lg border-2 border-[var(--border)]"
                style={{ backgroundColor: variant.colorHex }}
                title={variant.colorHex}
              />
            )}
            {variant.name}
          </h1>
        </div>
        <form action={deleteVariant}>
          <input type="hidden" name="variantId" value={variant.id} />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            onClick={(e) => {
              if (!confirm("Are you sure? This will delete the variant and all its images.")) {
                e.preventDefault();
              }
            }}
          >
            🗑️ Delete Variant
          </button>
        </form>
      </header>

      {/* Variant Info Form */}
      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Variant Details</h2>
        <form action={updateVariant} className="space-y-4">
          <input type="hidden" name="variantId" value={variant.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Variant Name *</label>
              <input
                type="text"
                name="name"
                defaultValue={variant.name}
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color Hex</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  defaultValue={variant.colorHex || "#000000"}
                  className="w-12 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
                />
                <input
                  type="text"
                  name="colorHex"
                  defaultValue={variant.colorHex || ""}
                  placeholder="#000000"
                  className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <input
                type="text"
                name="size"
                defaultValue={variant.size || ""}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock</label>
              <input
                type="number"
                name="stock"
                min="0"
                defaultValue={variant.stock}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SKU *</label>
              <input
                type="text"
                name="sku"
                defaultValue={variant.sku}
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
          </div>

          <Button type="submit">💾 Save Variant</Button>
        </form>
      </Card>

      {/* Variant Images Section */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Variant Images ({variant.images.length})</h2>
          <Link
            href={`/${lang}/admin/catalog/${product.id}/${variant.id}/add-image`}
            className="text-sm bg-[var(--primary)] text-white px-3 py-1.5 rounded-lg hover:opacity-90"
          >
            ➕ Add Image
          </Link>
        </div>

        {variant.images.length === 0 ? (
          <p className="text-[var(--ink-muted)] text-sm">No images yet. Add photos for this color/size combination.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {variant.images.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.imageUrl}
                  alt={img.altText || "Variant image"}
                  className="w-full aspect-square object-cover rounded-lg border border-[var(--border)]"
                />
                <form action={deleteVariantImage} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                  <input type="hidden" name="imageId" value={img.id} />
                  <button
                    type="submit"
                    className="bg-[var(--danger)] text-white p-2 rounded-lg text-xs hover:opacity-90"
                    onClick={(e) => {
                      if (!confirm("Delete this image?")) e.preventDefault();
                    }}
                  >
                    🗑️
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
