import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import Link from "next/link";
import { createNewProduct } from "./actions";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user) redirect(`/${lang}/login`);
  if (!isJorge(session)) notFound();

  const dict = await getDictionary(lang);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <header>
        <Link href={`/${lang}/admin/catalog`} className="text-[var(--primary)] hover:underline text-sm mb-2">
          ← Back to Catalog
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mt-2">Create New Product</h1>
        <p className="text-[var(--ink-muted)] mt-2">
          Add a new product to the Agon catalog. You can add images and variants after creation.
        </p>
      </header>

      {/* Create Form */}
      <Card className="space-y-6">
        <form action={createNewProduct} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2">Product Name (English) *</label>
              <input
                type="text"
                name="nameEn"
                placeholder="e.g., Agon Performance T-Shirt"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Product Name (Spanish)</label>
              <input
                type="text"
                name="nameEs"
                placeholder="e.g., Camiseta Agon Performance"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description (English)</label>
            <textarea
              name="descriptionEn"
              placeholder="Detailed product description. Highlight key features and benefits."
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Category *</label>
              <select
                name="category"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              >
                <option value="">Select category...</option>
                <option value="apparel">Apparel (T-shirts, Hoodies, etc.)</option>
                <option value="accessories">Accessories (Hats, Bags, etc.)</option>
                <option value="equipment">Equipment (Resistance Bands, etc.)</option>
                <option value="supplements">Supplements</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Price (€) *</label>
              <input
                type="number"
                name="price"
                step="0.01"
                min="0"
                placeholder="19.99"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">SKU *</label>
              <input
                type="text"
                name="sku"
                placeholder="e.g., AGON-TSHIRT-001"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isActive" defaultChecked className="w-4 h-4 rounded" />
              <span className="text-sm font-medium">Active (Visible in catalog)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="featured" className="w-4 h-4 rounded" />
              <span className="text-sm font-medium">Featured (Show on homepage)</span>
            </label>
          </div>

          <div className="border-t border-[var(--border)] pt-6 space-y-3">
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              ✓ Create the product first  <br />
              ✓ Then add images and variants  <br />
              ✓ You can edit everything anytime
            </p>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-[var(--primary)] text-white">
                ✓ Create Product
              </Button>
              <Link
                href={`/${lang}/admin/catalog`}
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
