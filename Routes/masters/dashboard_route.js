const express = require('express');
const { getAdminDashboardCounts, getTrainerDashboardCounts } = require('../../controllers/masters/dashboard_controller');
const router = express.Router();

// Admin dashboard counts
router.get('/dashboard-counts', getAdminDashboardCounts);

// Trainer dashboard counts
router.get('/trainer-dashboard-counts', getTrainerDashboardCounts);

module.exports = router;
