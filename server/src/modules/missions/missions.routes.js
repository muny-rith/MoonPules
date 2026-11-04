const express = require('express');
const router = express.Router();
const missionsController = require('./missions.controller');

router.get('/', missionsController.getMission);
router.get('/slots', missionsController.getCalendarSlots);
router.get('/audit', missionsController.getMonthAudit);
router.post('/', missionsController.saveMission);

// Individual slot operations for fast inline editing
router.post('/slots', missionsController.createSlot);
router.patch('/slots/:id', missionsController.updateSlot);
router.delete('/slots/:id', missionsController.deleteSlot);

module.exports = router;

