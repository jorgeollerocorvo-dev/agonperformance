import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import Link from "next/link";
import { createVariant } from "../actions";

export default async function AddVariantPage({
  params,
}: {
  params: Promise<{ lang: string; productId: string }>;
}) {
  const { lang, productId } = await params;
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

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <header>
        <Link href={`/${lang}/admin/catalog/${product.id}`} className="text-[var(--primary)] hover:underline text-sm mb-2">
          ← Back to {product.nameEn}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mt-2">Add Variant</h1>
        <p className="text-[var(--ink-muted)] mt-2">
          Create a new variant for this product (e.g., different color, size, or combination)
        </p>
      </header>

      {/* Add Variant Form */}
      <Card className="space-y-6">
        <form action={createVariant} className="space-y-4">
          <input type="hidden" name="productId" value={product.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2">Variant Name *</label>
              <input
                type="text"
                name="name"
                placeholder="e.g., Navy Blue - Small"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Descriptive name for this variant combination
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Color (Hex)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  name="colorHex"
                  defaultValue="#000000"
                  className="w-12 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="#000000"
                  className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                  list="colors"
                  disabled
                />
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Optional: Pick a color or leave blank
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Size</label>
              <input
                type="text"
                name="size"
                placeholder="e.g., S, M, L, XL"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Stock Quantity</label>
              <input
                type="number"
                name="stock"
                min="0"
                defaultValue="0"
                placeholder="0"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Variant SKU *</label>
              <input
                type="text"
                name="sku"
                placeholder="e.g., AGON-TSHIRT-NAVY-S"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Unique identifier for this variant
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-6 space-y-3">
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              ✓ Create the variant first<br />
              ✓ Then add variant-specific images<br />
              ✓ You can edit everything anytime
            </p>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-[var(--primary)] text-white">
                ✓ Create Variant
              </Button>
              <Link
                href={`/${lang}/admin/catalog/${product.id}`}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-center hover:bg-[var(--surface-2)]"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
