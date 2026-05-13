import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, hasLocale } from "../../../../dictionaries";
import { Card, Button } from "@/components/ui/Card";
import { isJorge } from "@/lib/jorge";
import Link from "next/link";
import { addImage } from "../actions";

export default async function AddImagePage({
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
        <h1 className="text-3xl sm:text-4xl font-bold mt-2">Add Product Image</h1>
        <p className="text-[var(--ink-muted)] mt-2">
          Add a high-quality image to your product. Upload to a cloud service (Cloudinary, AWS S3, etc.) and paste the URL below.
        </p>
      </header>

      {/* Add Image Form */}
      <Card className="space-y-6">
        <form action={addImage} className="space-y-4">
          <input type="hidden" name="productId" value={product.id} />

          <div>
            <label className="block text-sm font-semibold mb-2">Image URL *</label>
            <input
              type="url"
              name="imageUrl"
              placeholder="https://example.com/image.jpg"
              required
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Use a cloud CDN URL (Cloudinary, imgix, AWS S3, etc.) for best performance
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Alt Text (for accessibility)</label>
            <input
              type="text"
              name="altText"
              placeholder="e.g., 'Agon Performance T-Shirt in navy blue, front view'"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Describe the image for screen readers and SEO
            </p>
          </div>

          <div className="border-t border-[var(--border)] pt-6 space-y-3">
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              ✓ Upload image to a cloud service first<br />
              ✓ Copy the public image URL<br />
              ✓ Paste it here with descriptive alt text
            </p>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-[var(--primary)] text-white">
                ✓ Add Image
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
