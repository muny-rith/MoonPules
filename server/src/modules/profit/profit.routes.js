const express = require('express');
const router = express.Router();
const profitController = require('./profit.controller');

router.get('/dashboard', profitController.getDashboardProfit);
router.get('/posts/:id', profitController.getPostProfit);
router.get('/brands', profitController.getBrandProfitability);

module.exports = router;
