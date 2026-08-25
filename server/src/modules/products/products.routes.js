const express = require('express');
const router = express.Router();
const productsController = require('./products.controller');

router.get('/', productsController.getProducts);
router.get('/categories', productsController.getCategories);
router.get('/:id', productsController.getProductById);

module.exports = router;
