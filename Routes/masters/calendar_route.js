const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/masters/calendar_controller");
const verifyToken = require("../../Middleware/authmiddleware");


// Get all upcoming sessions (today and future)
router.get("/upcoming-sessions", ctrl.getUpcomingSessions);

module.exports = router;
