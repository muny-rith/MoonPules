const missionsService = require('./missions.service');

const getMission = async (req, res, next) => {
  try {
    const { brand_id, month, year } = req.query;
    if (!brand_id || !month || !year) {
      return res.status(400).json({ error: 'brand_id, month, and year are required query parameters' });
    }

    const mission = await missionsService.getMissionWithProgress(parseInt(brand_id, 10), parseInt(month, 10), parseInt(year, 10));
    res.json({ data: mission });
  } catch (err) {
    next(err);
  }
};

const getCalendarSlots = async (req, res, next) => {
  try {
    const { brand_id, month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required query parameters' });
    }

    const slots = await missionsService.getCalendarSlots(brand_id, parseInt(month, 10), parseInt(year, 10));
    res.json({ data: slots });
  } catch (err) {
    next(err);
  }
};

const saveMission = async (req, res, next) => {
  try {
    const { brand_id, brand_name, month, year, slots, notes } = req.body;
    if (!brand_id || !brand_name || !month || !year) {
      return res.status(400).json({ error: 'brand_id, brand_name, month, and year are required' });
    }

    const mission = await missionsService.saveMissionWithSlots({
      brand_id: parseInt(brand_id, 10),
      brand_name,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      slots: Array.isArray(slots) ? slots : [],
      notes,
    });

    res.status(201).json({ data: mission });
  } catch (err) {
    next(err);
  }
};

const getMonthAudit = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required query parameters' });
    }

    const audit = await missionsService.getMonthAudit(parseInt(month, 10), parseInt(year, 10));
    res.json({ data: audit });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMission,
  getCalendarSlots,
  saveMission,
  getMonthAudit,
};

