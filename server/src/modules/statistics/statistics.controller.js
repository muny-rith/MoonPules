const statisticsService = require('./statistics.service');

const getBrands = async (req, res, next) => {
  try {
    const { range, startDate, endDate, timezone } = req.query;
    const stats = await statisticsService.getBrandStats({ range, startDate, endDate, timezone });
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
    const { range, startDate, endDate, timezone } = req.query;
    const detail = await statisticsService.getBrandDetail(id, { range, startDate, endDate, timezone });
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
    const { platform, range, timezone } = req.query;
    const stats = await statisticsService.getDashboardStats({ platform, range, timezone });
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
