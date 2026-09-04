const profitService = require('./profit.service');

const getDashboardProfit = async (req, res, next) => {
  try {
    const { platform, range } = req.query;
    const data = await profitService.getDashboardProfit({ platform, range });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getPostProfit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await profitService.getPostProfit(id);
    if (!data) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getBrandProfitability = async (req, res, next) => {
  try {
    const data = await profitService.getBrandProfitability();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardProfit,
  getPostProfit,
  getBrandProfitability,
};
