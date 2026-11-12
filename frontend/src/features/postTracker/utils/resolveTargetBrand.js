/**
 * Find a brand object in the cached brands list matching either brand_id or id.
 */
export const findBrandById = (brandsList = [], targetBrandId) => {
  if (!targetBrandId || !Array.isArray(brandsList) || brandsList.length === 0) {
    return null;
  }
  const target = String(targetBrandId);
  return (
    brandsList.find((b) => String(b.brand_id) === target || String(b.id) === target) || null
  );
};

/**
 * Resolve the active brand object for contextual hashtag suggestions.
 * Uses selectedBrand when targeting a brand, or derives the brand from selectedProduct.
 */
export const resolveActiveHashtagBrand = ({
  trackingTarget,
  selectedBrand,
  selectedProduct,
  brandsList = [],
}) => {
  if (trackingTarget === 'brand') {
    return selectedBrand || null;
  }
  if (!selectedProduct) {
    return null;
  }
  const matched = findBrandById(brandsList, selectedProduct.brand_id);
  if (matched) {
    return matched;
  }
  return selectedProduct.brand_name ? { brand_name: selectedProduct.brand_name } : null;
};

