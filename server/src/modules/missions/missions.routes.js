const express = require('express');
const router = express.Router();
const missionsController = require('./missions.controller');

router.get('/', missionsController.getMission);
router.get('/slots', missionsController.getCalendarSlots);
router.get('/audit', missionsController.getMonthAudit);
router.post('/', missionsController.saveMission);

module.exports = router;

