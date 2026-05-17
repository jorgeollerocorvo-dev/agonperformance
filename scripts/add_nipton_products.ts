/**
 * Script to add Nipton products to the catalog
 * Usage: npx tsx scripts/add_nipton_products.ts
 */

import { prisma } from "../lib/prisma";

// Color definitions with hex codes
const colors = {
  burgundy: "#8B1538",
  black: "#000000",
  beige: "#F5E6D3",
  brown: "#654321",
  navy: "#001F3F",
  gray: "#808080",
  lightBlue: "#ADD8E6",
};

async function addProducts() {
  console.log("🛍️ Adding Nipton Products to Catalog...\n");

  try {
    // Product 1: DAW170 - Bag
    console.log("1️⃣ Creating DAW170 - Bag...");
    const bag = await prisma.catalogProduct.create({
      data: {
        nameEn: "Fashion Shoulder Bag",
        nameEs: "Bolsa de Hombro Fashionable",
        descriptionEn:
          "100% Polyester shoulder bag with ruched design. Size: 33.5×4×41 cm. Perfect for daily essentials.",
        category: "accessories",
        price: 15.0,
        sku: "DAW170",
        isActive: true,
        featured: true,
        order: 1,
        variants: {
          create: [
            {
              name: "Gray",
              colorHex: colors.gray,
              sku: "DAW170-GRAY",
              order: 1,
            },
            {
              name: "Black",
              colorHex: colors.black,
              sku: "DAW170-BLACK",
              order: 2,
            },
            {
              name: "Light Blue",
              colorHex: colors.lightBlue,
              sku: "DAW170-LIGHTBLUE",
              order: 3,
            },
          ],
        },
      },
    });
    console.log(`✅ DAW170 created with 3 color variants\n`);

    // Product 2: CK7725 - Pants
    console.log("2️⃣ Creating CK7725 - Pants...");
    const pants = await prisma.catalogProduct.create({
      data: {
        nameEn: "Performance Sweatpants",
        nameEs: "Pantalones de Rendimiento",
        descriptionEn:
          "83% Polyester + 17% Spandex comfort pants. Available in S/M/L/XL. Measurements: Length (cm): S-104, M-105, L-106, XL-107 | Hip (cm): S-110, M-114, L-118, XL-122 | Waist (cm): S-68, M-72, L-76, XL-80",
        category: "apparel",
        price: 15.64,
        sku: "CK7725",
        isActive: true,
        featured: true,
        order: 2,
        variants: {
          create: [
            {
              name: "Burgundy",
              colorHex: colors.burgundy,
              sku: "CK7725-BURGUNDY",
              order: 1,
            },
            {
              name: "Black",
              colorHex: colors.black,
              sku: "CK7725-BLACK",
              order: 2,
            },
            {
              name: "Beige",
              colorHex: colors.beige,
              sku: "CK7725-BEIGE",
              order: 3,
            },
            {
              name: "Brown",
              colorHex: colors.brown,
              sku: "CK7725-BROWN",
              order: 4,
            },
            {
              name: "Navy",
              colorHex: colors.navy,
              sku: "CK7725-NAVY",
              order: 5,
            },
          ],
        },
      },
    });
    console.log(`✅ CK7725 created with 5 color variants\n`);

    // Product 3: CX8933 - Long Sleeve Top
    console.log("3️⃣ Creating CX8933 - Long Sleeve Top...");
    const top = await prisma.catalogProduct.create({
      data: {
        nameEn: "Long Sleeve Crop Top",
        nameEs: "Top Corto de Manga Larga",
        descriptionEn:
          "78% Nylon + 22% Spandex crop top with long sleeves. Available in S/M/L/XL. Measurements: Length (cm): S-44, M-45, L-46, XL-47 | Bust (cm): S-72, M-76, L-80, XL-84 | Bottom (cm): S-58, M-62, L-66, XL-70",
        category: "apparel",
        price: 9.2,
        sku: "CX8933",
        isActive: true,
        featured: true,
        order: 3,
        variants: {
          create: [
            {
              name: "Burgundy",
              colorHex: colors.burgundy,
              sku: "CX8933-BURGUNDY",
              order: 1,
            },
            {
              name: "Black",
              colorHex: colors.black,
              sku: "CX8933-BLACK",
              order: 2,
            },
            {
              name: "Brown",
              colorHex: colors.brown,
              sku: "CX8933-BROWN",
              order: 3,
            },
            {
              name: "Gray",
              colorHex: colors.gray,
              sku: "CX8933-GRAY",
              order: 4,
            },
          ],
        },
      },
    });
    console.log(`✅ CX8933 created with 4 color variants\n`);

    console.log("🎉 All products added successfully!");
    console.log(`
Total Summary:
- Product 1: DAW170 Bag ($15) - 3 colors
- Product 2: CK7725 Pants ($15.64) - 5 colors
- Product 3: CX8933 Long Sleeve ($9.20) - 4 colors
- Total: 12 color variants ready for images
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding products:", error);
    process.exit(1);
  }
}

addProducts();
