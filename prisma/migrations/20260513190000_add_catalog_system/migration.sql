-- CreateTable "CatalogProduct"
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameEs" TEXT,
    "nameAr" TEXT,
    "descriptionEn" TEXT,
    "descriptionEs" TEXT,
    "descriptionAr" TEXT,
    "category" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "sku" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable "CatalogProductImage"
CREATE TABLE "CatalogProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable "CatalogProductVariant"
CREATE TABLE "CatalogProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "size" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable "CatalogProductVariantImage"
CREATE TABLE "CatalogProductVariantImage" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProductVariantImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_sku_key" ON "CatalogProduct"("sku");

-- CreateIndex
CREATE INDEX "CatalogProduct_category_idx" ON "CatalogProduct"("category");

-- CreateIndex
CREATE INDEX "CatalogProduct_isActive_idx" ON "CatalogProduct"("isActive");

-- CreateIndex
CREATE INDEX "CatalogProductImage_productId_idx" ON "CatalogProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProductVariant_sku_key" ON "CatalogProductVariant"("sku");

-- CreateIndex
CREATE INDEX "CatalogProductVariant_productId_idx" ON "CatalogProductVariant"("productId");

-- AddForeignKey
ALTER TABLE "CatalogProductImage" ADD CONSTRAINT "CatalogProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductVariant" ADD CONSTRAINT "CatalogProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductVariantImage" ADD CONSTRAINT "CatalogProductVariantImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CatalogProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
