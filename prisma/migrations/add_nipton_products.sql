-- Add Nipton Products

-- DAW170 - Bag
INSERT INTO "CatalogProduct" ("id", "nameEn", "nameEs", "nameAr", "descriptionEn", "descriptionEs", "descriptionAr", "category", "price", "currency", "sku", "isActive", "featured", "order", "createdAt", "updatedAt")
VALUES (
  'daw170_bag', 
  'Fashion Shoulder Bag', 
  'Bolsa de Hombro Fashionable', 
  NULL, 
  '100% Polyester shoulder bag with ruched design. Size: 33.5×4×41 cm. Perfect for daily essentials.', 
  NULL, 
  NULL, 
  'accessories', 
  15.00, 
  'USD', 
  'DAW170', 
  true, 
  true, 
  1, 
  NOW(), 
  NOW()
);

INSERT INTO "CatalogProductVariant" ("id", "productId", "name", "colorHex", "size", "stock", "sku", "order", "createdAt", "updatedAt")
VALUES 
  ('daw170_gray', 'daw170_bag', 'Gray', '#808080', NULL, NULL, 'DAW170-GRAY', 1, NOW(), NOW()),
  ('daw170_black', 'daw170_bag', 'Black', '#000000', NULL, NULL, 'DAW170-BLACK', 2, NOW(), NOW()),
  ('daw170_lightblue', 'daw170_bag', 'Light Blue', '#ADD8E6', NULL, NULL, 'DAW170-LIGHTBLUE', 3, NOW(), NOW());

-- CK7725 - Pants
INSERT INTO "CatalogProduct" ("id", "nameEn", "nameEs", "nameAr", "descriptionEn", "descriptionEs", "descriptionAr", "category", "price", "currency", "sku", "isActive", "featured", "order", "createdAt", "updatedAt")
VALUES (
  'ck7725_pants', 
  'Performance Sweatpants', 
  'Pantalones de Rendimiento', 
  NULL, 
  '83% Polyester + 17% Spandex comfort pants. Available in S/M/L/XL. Measurements: Length (cm): S-104, M-105, L-106, XL-107 | Hip (cm): S-110, M-114, L-118, XL-122 | Waist (cm): S-68, M-72, L-76, XL-80', 
  NULL, 
  NULL, 
  'apparel', 
  15.64, 
  'USD', 
  'CK7725', 
  true, 
  true, 
  2, 
  NOW(), 
  NOW()
);

INSERT INTO "CatalogProductVariant" ("id", "productId", "name", "colorHex", "size", "stock", "sku", "order", "createdAt", "updatedAt")
VALUES 
  ('ck7725_burgundy', 'ck7725_pants', 'Burgundy', '#8B1538', NULL, NULL, 'CK7725-BURGUNDY', 1, NOW(), NOW()),
  ('ck7725_black', 'ck7725_pants', 'Black', '#000000', NULL, NULL, 'CK7725-BLACK', 2, NOW(), NOW()),
  ('ck7725_beige', 'ck7725_pants', 'Beige', '#F5E6D3', NULL, NULL, 'CK7725-BEIGE', 3, NOW(), NOW()),
  ('ck7725_brown', 'ck7725_pants', 'Brown', '#654321', NULL, NULL, 'CK7725-BROWN', 4, NOW(), NOW()),
  ('ck7725_navy', 'ck7725_pants', 'Navy', '#001F3F', NULL, NULL, 'CK7725-NAVY', 5, NOW(), NOW());

-- CX8933 - Long Sleeve Top
INSERT INTO "CatalogProduct" ("id", "nameEn", "nameEs", "nameAr", "descriptionEn", "descriptionEs", "descriptionAr", "category", "price", "currency", "sku", "isActive", "featured", "order", "createdAt", "updatedAt")
VALUES (
  'cx8933_top', 
  'Long Sleeve Crop Top', 
  'Top Corto de Manga Larga', 
  NULL, 
  '78% Nylon + 22% Spandex crop top with long sleeves. Available in S/M/L/XL. Measurements: Length (cm): S-44, M-45, L-46, XL-47 | Bust (cm): S-72, M-76, L-80, XL-84 | Bottom (cm): S-58, M-62, L-66, XL-70', 
  NULL, 
  NULL, 
  'apparel', 
  9.20, 
  'USD', 
  'CX8933', 
  true, 
  true, 
  3, 
  NOW(), 
  NOW()
);

INSERT INTO "CatalogProductVariant" ("id", "productId", "name", "colorHex", "size", "stock", "sku", "order", "createdAt", "updatedAt")
VALUES 
  ('cx8933_burgundy', 'cx8933_top', 'Burgundy', '#8B1538', NULL, NULL, 'CX8933-BURGUNDY', 1, NOW(), NOW()),
  ('cx8933_black', 'cx8933_top', 'Black', '#000000', NULL, NULL, 'CX8933-BLACK', 2, NOW(), NOW()),
  ('cx8933_brown', 'cx8933_top', 'Brown', '#654321', NULL, NULL, 'CX8933-BROWN', 3, NOW(), NOW()),
  ('cx8933_gray', 'cx8933_top', 'Gray', '#808080', NULL, NULL, 'CX8933-GRAY', 4, NOW(), NOW());
