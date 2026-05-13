import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";

export default async function CatalogPage({ params }: PageProps<"/[lang]/admin/catalog">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!isJorge(session)) notFound(); // Only Jorge can access catalog

  const dict = await getDictionary(lang);

  // Fetch all products with images
  const products = await prisma.catalogProduct.findMany({
    include: {
      images: { orderBy: { order: "asc" } },
      variants: {
        include: { images: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">🛍️ Agon Catalog</h1>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] mt-2">
            Manage products, variants, colors, and high-quality images
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${lang}/admin/catalog/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold hover:opacity-90"
          >
            ➕ Add Product
          </Link>
          <Link
            href={`/${lang}/admin/catalog/images`}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--primary)] text-[var(--primary)] px-4 py-2 font-semibold hover:bg-[var(--primary-soft)]"
          >
            🖼️ Manage Images
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Total Products</div>
          <div className="text-3xl font-bold mt-0.5">{products.length}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Total Variants</div>
          <div className="text-3xl font-bold mt-0.5">
            {products.reduce((sum, p) => sum + p.variants.length, 0)}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">Total Images</div>
          <div className="text-3xl font-bold mt-0.5">
            {products.reduce((sum, p) => sum + p.images.length + p.variants.reduce((vs, v) => vs + v.images.length, 0), 0)}
          </div>
        </Card>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--ink-muted)] mb-4">No products yet. Create your first product to get started!</p>
          <Link
            href={`/${lang}/admin/catalog/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] text-white px-6 py-3 font-semibold hover:opacity-90"
          >
            ➕ Add First Product
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/${lang}/admin/catalog/${product.id}`}
              className="group"
            >
              <Card className="p-0 overflow-hidden hover:shadow-lg transition h-full flex flex-col">
                {/* Product Image */}
                <div className="aspect-square bg-[var(--surface-2)] overflow-hidden relative">
                  {product.images.length > 0 ? (
                    <img
                      src={product.images[0].imageUrl}
                      alt={product.images[0].altText || product.nameEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--ink-muted)]">
                      📷 No images
                    </div>
                  )}
                  {product.featured && (
                    <div className="absolute top-2 right-2 bg-[var(--primary)] text-white px-2 py-1 rounded text-xs font-bold">
                      Featured
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold text-base line-clamp-2">{product.nameEn}</h3>
                    <p className="text-xs text-[var(--ink-muted)] mt-1">{product.category}</p>
                  </div>

                  <div className="text-lg font-bold">${product.price.toString()}</div>

                  {/* Variants & Images Count */}
                  <div className="text-xs text-[var(--ink-muted)] space-y-1 border-t border-[var(--border)] pt-3">
                    <div>🎨 {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}</div>
                    <div>🖼️ {product.images.length} image{product.images.length !== 1 ? "s" : ""}</div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                    <div className={`w-2 h-2 rounded-full ${product.isActive ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`} />
                    <span className="text-xs font-medium">
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
