import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import Link from "next/link";
import { updateProduct, deleteProduct, createVariant, updateVariant, deleteVariant, addImage, deleteImage } from "./actions";

export default async function ProductDetailPage({
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
    include: {
      images: { orderBy: { order: "asc" } },
      variants: {
        include: { images: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!product) notFound();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href={`/${lang}/admin/catalog`} className="text-[var(--primary)] hover:underline text-sm mb-2">
            ← Back to Catalog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold">{product.nameEn}</h1>
          <p className="text-[var(--ink-muted)] mt-1">{product.category}</p>
        </div>
        <form action={deleteProduct}>
          <input type="hidden" name="productId" value={product.id} />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            onClick={(e) => {
              if (!confirm("Are you sure? This will delete the product and all its images & variants.")) {
                e.preventDefault();
              }
            }}
          >
            🗑️ Delete Product
          </button>
        </form>
      </header>

      {/* Product Info Form */}
      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Product Info</h2>
        <form action={updateProduct} className="space-y-4">
          <input type="hidden" name="productId" value={product.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Name (English) *</label>
              <input
                type="text"
                name="nameEn"
                defaultValue={product.nameEn}
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name (Spanish)</label>
              <input
                type="text"
                name="nameEs"
                defaultValue={product.nameEs || ""}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (English)</label>
            <textarea
              name="descriptionEn"
              defaultValue={product.descriptionEn || ""}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <input
                type="text"
                name="category"
                defaultValue={product.category}
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
                placeholder="apparel, accessories, equipment..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price *</label>
              <input
                type="number"
                name="price"
                step="0.01"
                defaultValue={product.price.toString()}
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SKU *</label>
              <input
                type="text"
                name="sku"
                defaultValue={product.sku}
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isActive" defaultChecked={product.isActive} />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="featured" defaultChecked={product.featured} />
              <span className="text-sm">Featured on Homepage</span>
            </label>
          </div>

          <Button type="submit">💾 Save Product</Button>
        </form>
      </Card>

      {/* Product Images Section */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Product Images ({product.images.length})</h2>
          <Link
            href={`/${lang}/admin/catalog/${product.id}/add-image`}
            className="text-sm bg-[var(--primary)] text-white px-3 py-1.5 rounded-lg hover:opacity-90"
          >
            ➕ Add Image
          </Link>
        </div>

        {product.images.length === 0 ? (
          <p className="text-[var(--ink-muted)] text-sm">No images yet. Add high-quality product photos.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {product.images.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.imageUrl}
                  alt={img.altText || "Product image"}
                  className="w-full aspect-square object-cover rounded-lg border border-[var(--border)]"
                />
                <form action={deleteImage} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
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

      {/* Variants Section */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Variants / Colors / Sizes ({product.variants.length})</h2>
          <Link
            href={`/${lang}/admin/catalog/${product.id}/add-variant`}
            className="text-sm bg-[var(--primary)] text-white px-3 py-1.5 rounded-lg hover:opacity-90"
          >
            ➕ Add Variant
          </Link>
        </div>

        {product.variants.length === 0 ? (
          <p className="text-[var(--ink-muted)] text-sm">No variants yet. Add colors, sizes, or other variations.</p>
        ) : (
          <div className="space-y-3">
            {product.variants.map((variant) => (
              <Link
                key={variant.id}
                href={`/${lang}/admin/catalog/${product.id}/${variant.id}`}
                className="block p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold flex items-center gap-2">
                      {variant.colorHex && (
                        <div
                          className="w-6 h-6 rounded-full border border-[var(--border)]"
                          style={{ backgroundColor: variant.colorHex }}
                          title={variant.name}
                        />
                      )}
                      {variant.name}
                    </h3>
                    <div className="text-xs text-[var(--ink-muted)] mt-1 space-y-1">
                      <div>SKU: {variant.sku}</div>
                      <div>📦 Stock: {variant.stock}</div>
                      <div>🖼️ {variant.images.length} image{variant.images.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <form action={deleteVariant}>
                    <input type="hidden" name="variantId" value={variant.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] px-2 py-1 rounded"
                      onClick={(e) => {
                        if (!confirm("Delete this variant?")) e.preventDefault();
                      }}
                    >
                      🗑️
                    </button>
                  </form>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
