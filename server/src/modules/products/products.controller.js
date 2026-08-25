const productsService = require('./products.service');

const getProducts = async (req, res, next) => {
  try {
    const { category, search, stockStatus } = req.query;
    const products = await productsService.listProducts({ category, search, stockStatus });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await productsService.getCategories();
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getCategories,
};
