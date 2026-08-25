const statisticsService = require('./statistics.service');

const getBrands = async (req, res, next) => {
  try {
    const stats = await statisticsService.getBrandStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

const getBrandDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const detail = await statisticsService.getBrandDetail(id);
    res.json({
      success: true,
      data: detail
    });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const stats = await statisticsService.getDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBrands,
  getBrandDetail,
  getDashboard
};
