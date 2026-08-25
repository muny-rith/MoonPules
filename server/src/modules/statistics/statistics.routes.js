const express = require('express');
const router = express.Router();
const statisticsController = require('./statistics.controller');

router.get('/dashboard', statisticsController.getDashboard);
router.get('/brands', statisticsController.getBrands);
router.get('/brands/:id', statisticsController.getBrandDetail);

module.exports = router;
