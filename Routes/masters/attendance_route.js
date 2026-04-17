const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/masters/attendance_controller");

// Save attendance for a training
router.post("/save", ctrl.saveAttendance);

// Enroll current employee for a training
router.post("/enroll", ctrl.enrollTraining);

// Get current employee enrollment status for a training
router.get("/enroll-status", ctrl.getEnrollmentStatus);

// Get attendance records for a training
router.get("/", ctrl.getAttendance);

// Get attendance summary for a training
router.get("/summary", ctrl.getAttendanceSummary);

// Get attendance records by user
router.get("/user/:user_id", ctrl.getUserAttendance);

// Get attendance records for date range
router.get("/date-range", ctrl.getAttendanceByDateRange);

// Update single attendance record
router.put("/", ctrl.updateAttendance);

// Delete attendance records
router.delete("/", ctrl.deleteAttendance);

module.exports = router;
