import { prisma } from "@/lib/prisma";

interface ProductData {
  sku: string;
  name: string;
  price: number;
  material: string;
  available_colors: number;
  sizes: string[];
  category: string;
}

const NIPTON_PRODUCTS: ProductData[] = [
  // BRAS
  {
    sku: "NIP-BRA-001",
    name: "Premium Sports Bra",
    price: 19.20,
    material: "78% Nylon + 22% Spandex",
    available_colors: 7,
    sizes: ["S", "M", "L", "XL"],
    category: "bra"
  },
  {
    sku: "NIP-BRA-002",
    name: "Classic Bra",
    price: 8.58,
    material: "75% Nylon + 25% Spandex",
    available_colors: 7,
    sizes: ["S", "M", "L", "XL"],
    category: "bra"
  },
  {
    sku: "NIP-BRA-003",
    name: "Training Bra",
    price: 8.81,
    material: "78% Nylon + 22% Spandex",
    available_colors: 8,
    sizes: ["S", "M", "L", "XL"],
    category: "bra"
  },
  
  // LEGGINGS
  {
    sku: "NIP-LEG-001",
    name: "Classic Leggings",
    price: 8.37,
    material: "78% Nylon + 22% Spandex",
    available_colors: 1,
    sizes: ["S", "M", "L", "XL"],
    category: "leggings"
  },
  {
    sku: "NIP-LEG-002",
    name: "Performance Leggings",
    price: 11.13,
    material: "78% Nylon + 22% Spandex",
    available_colors: 1,
    sizes: ["S", "M", "L", "XL"],
    category: "leggings"
  },
  {
    sku: "NIP-LEG-003",
    name: "Premium Leggings Set",
    price: 21.70,
    material: "78% Nylon + 22% Spandex",
    available_colors: 4,
    sizes: ["S", "M", "L", "XL"],
    category: "leggings"
  },
  {
    sku: "NIP-LEG-004",
    name: "Athletic Leggings",
    price: 10.16,
    material: "75% Nylon + 25% Spandex",
    available_colors: 6,
    sizes: ["S", "M", "L", "XL"],
    category: "leggings"
  },
  {
    sku: "NIP-LEG-005",
    name: "Flex Leggings",
    price: 11.29,
    material: "78% Nylon + 22% Spandex",
    available_colors: 12,
    sizes: ["S", "M", "L", "XL"],
    category: "leggings"
  },
  
  // SHORTS
  {
    sku: "NIP-SHO-001",
    name: "Classic Shorts",
    price: 6.85,
    material: "78% Nylon + 22% Spandex",
    available_colors: 1,
    sizes: ["S", "M", "L", "XL"],
    category: "shorts"
  },
  {
    sku: "NIP-SHO-002",
    name: "Training Shorts",
    price: 8.13,
    material: "78% Nylon + 22% Spandex",
    available_colors: 1,
    sizes: ["S", "M", "L", "XL"],
    category: "shorts"
  },
  {
    sku: "NIP-SHO-003",
    name: "Colorful Shorts",
    price: 9.56,
    material: "78% Nylon + 22% Spandex",
    available_colors: 9,
    sizes: ["S", "M", "L", "XL"],
    category: "shorts"
  },
  
  // PANTS
  {
    sku: "NIP-PAN-001",
    name: "Classic Pants",
    price: 11.26,
    material: "78% Nylon + 22% Spandex (UPF50+)",
    available_colors: 1,
    sizes: ["S", "M", "L", "XL"],
    category: "pants"
  },
  {
    sku: "NIP-PAN-002",
    name: "Cotton Blend Pants",
    price: 14.68,
    material: "86% Cotton + 14% Spandex",
    available_colors: 6,
    sizes: ["S", "M", "L", "XL"],
    category: "pants"
  },
  
  // TOPS
  {
    sku: "NIP-TOP-001",
    name: "Long Sleeve Top",
    price: 9.48,
    material: "78% Nylon + 22% Spandex",
    available_colors: 5,
    sizes: ["S", "M", "L", "XL"],
    category: "tops"
  },
  
  // JACKETS
  {
    sku: "NIP-JAC-001",
    name: "Performance Jacket",
    price: 10.70,
    material: "78% Nylon + 22% Spandex",
    available_colors: 1,
    sizes: ["S", "M", "L", "XL"],
    category: "jackets"
  },
  
  // SKIRTS
  {
    sku: "NIP-SKI-001",
    name: "Athletic Skirt",
    price: 12.17,
    material: "78% Nylon + 22% Spandex",
    available_colors: 1,
    sizes: ["S", "M", "L", "XL"],
    category: "skirts"
  },
];

async function importNiptonCatalog() {
  console.log("Starting Nipton catalog import...");
  
  try {
    for (const product of NIPTON_PRODUCTS) {
      // Create product
      const createdProduct = await prisma.catalogProduct.create({
        data: {
          nameEn: product.name,
          nameEs: product.name, // TODO: Add Spanish translations
          descriptionEn: `Nipton ${product.name} - ${product.material}`,
          descriptionEs: `Nipton ${product.name} - ${product.material}`,
          category: product.category,
          price: product.price,
          currency: "EUR",
          sku: product.sku,
          isActive: true,
          featured: false,
          order: 0,
        },
      });
      
      console.log(`✓ Created product: ${product.name} (${product.sku})`);
      
      // Create variants for each color
      const colorOptions = ["Black", "White", "Navy", "Gray", "Red", "Blue", "Green"];
      for (let i = 0; i < Math.min(product.available_colors, 7); i++) {
        await prisma.catalogProductVariant.create({
          data: {
            productId: createdProduct.id,
            name: colorOptions[i] || `Color ${i + 1}`,
            colorHex: getColorHex(colorOptions[i] || ""),
            size: product.sizes[0],
            stock: 50, // Default stock
            sku: `${product.sku}-${colorOptions[i].toLowerCase()}`,
            order: i,
          },
        });
      }
    }
    
    console.log("\n✓ Successfully imported all Nipton products!");
    console.log(`Total products created: ${NIPTON_PRODUCTS.length}`);
  } catch (error) {
    console.error("Error importing catalog:", error);
    process.exit(1);
  }
}

function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    "Black": "#000000",
    "White": "#FFFFFF",
    "Navy": "#001F3F",
    "Gray": "#808080",
    "Red": "#FF4136",
    "Blue": "#0074D9",
    "Green": "#2ECC40",
  };
  return colors[colorName] || "#000000";
}

importNiptonCatalog();
