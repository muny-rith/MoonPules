const client = require('./products.client');

let lastKnownProducts = [];
let lastKnownCategories = [];
let lastKnownBrands = [];

const normalizeProduct = (p) => {
  const prodId = p.product_id || p.id;
  return {
    id: prodId,
    product_id: prodId,
    product_code: p.product_code || p.sku || p.code || (prodId ? `SKU-${prodId}` : 'SKU-0'),
    product_name: p.product_name || p.name || 'Unnamed Product',
    category_id: p.category_id || 1,
    category_name: p.category_name || p.category || 'General',
    brand_id: p.brand_id || null,
    brand_name: p.brand_name || 'No Brand',
    department: p.department || 'General',
    unit_price: parseFloat(p.unit_price || p.price || 0),
    image_url: p.image_url || null,
    on_hand_qty: parseInt(p.on_hand_qty ?? p.stock ?? 0, 10),
    reserved_qty: parseInt(p.reserved_qty ?? 0, 10),
    is_active: p.is_active !== undefined ? p.is_active : true,
    variants: Array.isArray(p.variants) ? p.variants : [],
  };
};

const listProducts = async ({ category, search, stockStatus } = {}) => {
  let products = [];
  try {
    const rawData = await client.getProductsFromIms();
    if (Array.isArray(rawData)) {
      products = rawData.map(normalizeProduct);
    } else if (rawData && Array.isArray(rawData.data)) {
      products = rawData.data.map(normalizeProduct);
    } else {
      products = [];
    }

    if (products.length > 0) {
      lastKnownProducts = products;
    }
  } catch (err) {
    console.warn(`[ProductsService] Moon IMS API unavailable (${err.message}). Using last known products (${lastKnownProducts.length}).`);
    products = lastKnownProducts.length > 0 ? [...lastKnownProducts] : [];
  }

  // Filtering
  if (search) {
    const q = search.toLowerCase().trim();
    products = products.filter(p =>
      p.product_name?.toLowerCase().includes(q) ||
      p.product_code?.toLowerCase().includes(q) ||
      p.category_name?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
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
    if (raw) {
      const data = raw.data || raw;
      return normalizeProduct(data);
    }
  } catch (err) {
    console.warn(`[ProductsService] IMS lookup failed for product ${id}: ${err.message}`);
  }

  // Fallback to searching in lastKnownProducts
  const fallback = lastKnownProducts.find(p => String(p.id) === String(id));
  if (fallback) return fallback;

  const error = new Error(`Product with ID ${id} not found`);
  error.status = 404;
  throw error;
};

const getCategories = async () => {
  try {
    const rawCats = await client.getCategoriesFromIms();
    const catList = Array.isArray(rawCats) ? rawCats : (rawCats?.data || []);
    if (catList.length > 0) {
      const names = catList.map(c => c.category_name || c.name).filter(Boolean);
      lastKnownCategories = Array.from(new Set(names));
      return lastKnownCategories;
    }
  } catch (e) {
    // fallback below
  }

  const products = await listProducts();
  const categories = Array.from(
    new Set(products.map(p => p.category_name).filter(Boolean))
  );
  if (categories.length > 0) {
    lastKnownCategories = categories;
  }
  return lastKnownCategories.length > 0 ? lastKnownCategories : categories;
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
    if (brands.length > 0) {
      lastKnownBrands = brands;
    }
  } catch (err) {
    console.warn(`[ProductsService] Moon IMS API unavailable for brands (${err.message}). Using last known brands (${lastKnownBrands.length}).`);
    brands = lastKnownBrands.length > 0 ? [...lastKnownBrands] : [];
  }

  return brands;
};

module.exports = {
  listProducts,
  getProductById,
  getCategories,
  listBrands,
};

