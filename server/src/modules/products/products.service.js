const client = require('./products.client');

// High-fidelity fallback catalog if IMS server is not actively reachable
const FALLBACK_PRODUCTS = [
  {
    product_id: 1,
    product_code: 'SKU-LIP-001',
    product_name: 'Moon Velvet Matte Lipstick (Cherry Moon)',
    product_id: 1,
    product_code: 'SKU-LIP-001',
    product_name: 'Moon Velvet Matte Lipstick (Cherry Moon)',
    category_id: 1,
    category_name: 'Cosmetics',
    brand_id: 1,
    brand_name: 'Moon Beauty',
    department: 'Beauty',
    unit_price: 18.50,
    image_url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 145,
    reserved_qty: 12,
    is_active: true,
  },
  {
    product_id: 2,
    product_code: 'SKU-GLW-002',
    product_name: 'Luminous Hydra Glow Serum (50ml)',
    category_id: 1,
    category_name: 'Cosmetics',
    brand_id: 1,
    brand_name: 'Moon Beauty',
    department: 'Skincare',
    unit_price: 34.00,
    image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 82,
    reserved_qty: 8,
    is_active: true,
  },
  {
    product_id: 3,
    product_code: 'SKU-JWL-003',
    product_name: 'Celestial Crescent Moon Pendant (18k Gold)',
    category_id: 2,
    category_name: 'Jewelry',
    brand_id: 2,
    brand_name: 'Starlight Gems',
    department: 'Accessories',
    unit_price: 129.00,
    image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 24,
    reserved_qty: 3,
    is_active: true,
  },
  {
    product_id: 4,
    product_code: 'SKU-BAG-004',
    product_name: 'Aurora Minimalist Vegan Leather Tote',
    category_id: 3,
    category_name: 'Apparel',
    brand_id: 3,
    brand_name: 'Aurora Classics',
    department: 'Bags',
    unit_price: 89.90,
    image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 56,
    reserved_qty: 5,
    is_active: true,
  },
  {
    product_id: 5,
    product_code: 'SKU-PRF-005',
    product_name: 'Midnight Bloom Eau de Parfum (100ml)',
    category_id: 1,
    category_name: 'Cosmetics',
    brand_id: 1,
    brand_name: 'Moon Beauty',
    department: 'Fragrance',
    unit_price: 68.00,
    image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 38,
    reserved_qty: 4,
    is_active: true,
  },
  {
    product_id: 6,
    product_code: 'SKU-WAT-006',
    product_name: 'Eclipse Chronograph Watch (Onyx Black)',
    category_id: 2,
    category_name: 'Jewelry',
    brand_id: 2,
    brand_name: 'Starlight Gems',
    department: 'Watches',
    unit_price: 195.00,
    image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 15,
    reserved_qty: 2,
    is_active: true,
  },
  {
    product_id: 7,
    product_code: 'SKU-GLS-007',
    product_name: 'Solaris Retro Aviator Sunglasses',
    category_id: 3,
    category_name: 'Apparel',
    brand_id: 3,
    brand_name: 'Aurora Classics',
    department: 'Eyewear',
    unit_price: 45.00,
    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 95,
    reserved_qty: 10,
    is_active: true,
  },
  {
    product_id: 8,
    product_code: 'SKU-CRM-008',
    product_name: 'Radiance Peptide Eye Renewal Cream',
    category_id: 1,
    category_name: 'Cosmetics',
    brand_id: 1,
    brand_name: 'Moon Beauty',
    department: 'Skincare',
    unit_price: 28.50,
    image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&auto=format&fit=crop&q=80',
    on_hand_qty: 60,
    reserved_qty: 6,
    is_active: true,
  }
];

const normalizeProduct = (p) => ({
  id: p.product_id || p.id,
  product_id: p.product_id || p.id,
  product_code: p.product_code || p.code || `SKU-${p.id}`,
  product_name: p.product_name || p.name,
  category_id: p.category_id || 1,
  category_name: p.category_name || p.category || 'General',
  brand_id: p.brand_id || null,
  brand_name: p.brand_name || 'No Brand',
  department: p.department || 'General',
  unit_price: parseFloat(p.unit_price || p.price || 0),
  image_url: p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  on_hand_qty: parseInt(p.on_hand_qty ?? p.stock ?? 0, 10),
  reserved_qty: parseInt(p.reserved_qty ?? 0, 10),
  is_active: p.is_active !== undefined ? p.is_active : true,
});

const listProducts = async ({ category, search, stockStatus } = {}) => {
  let products = [];
  try {
    const rawData = await client.getProductsFromIms();
    if (Array.isArray(rawData)) {
      products = rawData.map(normalizeProduct);
    } else if (rawData && Array.isArray(rawData.data)) {
      products = rawData.data.map(normalizeProduct);
    } else {
      products = FALLBACK_PRODUCTS.map(normalizeProduct);
    }
  } catch (err) {
    console.warn(`[ProductsService] Moon IMS API unavailable (${err.message}). Using fallback product catalogue.`);
    products = FALLBACK_PRODUCTS.map(normalizeProduct);
  }

  // Filtering
  if (search) {
    const q = search.toLowerCase().trim();
    products = products.filter(p =>
      p.product_name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q) ||
      p.category_name?.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'all') {
    products = products.filter(p =>
      p.category_name?.toLowerCase() === category.toLowerCase() ||
      String(p.category_id) === String(category)
    );
  }

  if (stockStatus) {
    if (stockStatus === 'in_stock') {
      products = products.filter(p => p.on_hand_qty > 0);
    } else if (stockStatus === 'low_stock') {
      products = products.filter(p => p.on_hand_qty > 0 && p.on_hand_qty <= 20);
    } else if (stockStatus === 'out_of_stock') {
      products = products.filter(p => p.on_hand_qty === 0);
    }
  }

  return products;
};

const getProductById = async (id) => {
  try {
    const raw = await client.getProductByIdFromIms(id);
    if (raw) return normalizeProduct(raw);
  } catch (err) {
    console.warn(`[ProductsService] IMS lookup failed for product ${id}. Checking fallback.`);
  }

  const fallback = FALLBACK_PRODUCTS.find(p => String(p.product_id) === String(id));
  if (fallback) return normalizeProduct(fallback);

  const error = new Error(`Product with ID ${id} not found`);
  error.status = 404;
  throw error;
};

const getCategories = async () => {
  const products = await listProducts();
  const categories = Array.from(
    new Set(products.map(p => p.category_name).filter(Boolean))
  );
  return categories;
};

const listBrands = async () => {
  let brands = [];
  try {
    const rawData = await client.getBrandsFromIms();
    if (Array.isArray(rawData)) {
      brands = rawData;
    } else if (rawData && Array.isArray(rawData.data)) {
      brands = rawData.data;
    } else {
      brands = [];
    }
  } catch (err) {
    console.warn(`[ProductsService] Moon IMS API unavailable for brands (${err.message}).`);
  }
  return brands;
};

module.exports = {
  listProducts,
  getProductById,
  getCategories,
  listBrands,
};
