const Attendance = require("../../model/masters/attendance_model");

exports.saveAttendance = async (req, res) => {
  try {
    const { training_id, attendees } = req.body;

    console.log('📝 Attendance Save Request:', { training_id, attendees_count: attendees?.length });

    // Validate required fields
    if (!training_id || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ 
        error: "Invalid data. Required fields: training_id, attendees (non-empty array)" 
      });
    }

    // Validate attendees structure
    const validAttendees = attendees.every(emp => 
      emp.user_id && ('is_attended' in emp)
    );

    if (!validAttendees) {
      return res.status(400).json({ 
        error: "Invalid attendee data. Each attendee must have: user_id (from tg_ad_users), is_attended" 
      });
    }

    const result = await Attendance.saveAttendance({
      training_id,
      attendees,
      updated_by: req?.user?.id,
    });

    console.log('✅ Attendance saved successfully:', result);

    res.status(200).json({
      success: true,
      message: result.message,
      training_id: result.training_id,
      records_saved: result.records_saved
    });
  } catch (error) {
    console.error("❌ Save attendance error:", error.message, error.stack);
    res.status(500).json({ 
      error: "Failed to save attendance",
      message: error.message 
    });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { training_id } = req.query;

    if (!training_id) {
      return res.status(400).json({ error: "training_id is required" });
    }

    const records = await Attendance.getAttendanceByTraining(training_id);

    res.json({
      success: true,
      training_id,
      records
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { training_id } = req.query;

    if (!training_id) {
      return res.status(400).json({ error: "training_id is required" });
    }

    const summary = await Attendance.getAttendanceSummary(training_id);

    res.json({
      success: true,
      training_id,
      summary
    });
  } catch (error) {
    console.error("Get attendance summary error:", error);
    res.status(500).json({ error: "Failed to fetch attendance summary" });
  }
};

exports.getUserAttendance = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const records = await Attendance.getAttendanceByUser(user_id);

    res.json({
      success: true,
      user_id,
      records
    });
  } catch (error) {
    console.error("Get user attendance error:", error);
    res.status(500).json({ error: "Failed to fetch user attendance records" });
  }
};

exports.getAttendanceByDateRange = async (req, res) => {
  try {
    const { training_id } = req.query;

    if (!training_id) {
      return res.status(400).json({ 
        error: "training_id is required" 
      });
    }

    const records = await Attendance.getAttendanceByDateRange(training_id);

    res.json({
      success: true,
      training_id,
      records
    });
  } catch (error) {
    console.error("Get attendance by date range error:", error);
    res.status(500).json({ error: "Failed to fetch attendance records for date range" });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { training_id, user_id, is_attended } = req.body;

    if (!training_id || !user_id || is_attended === undefined) {
      return res.status(400).json({ 
        error: "Required fields: training_id, user_id, is_attended" 
      });
    }

    const updated = await Attendance.updateAttendance(training_id, user_id, is_attended);

    if (!updated) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.json({
      success: true,
      message: "Attendance updated successfully",
      training_id,
      user_id
    });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ error: "Failed to update attendance" });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const { training_id } = req.body;

    if (!training_id) {
      return res.status(400).json({ error: "training_id is required" });
    }

    const deleted = await Attendance.deleteAttendance(training_id);

    res.json({
      success: true,
      message: `${deleted} attendance record(s) deleted`,
      training_id,
      records_deleted: deleted
    });
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({ error: "Failed to delete attendance records" });
  }
};

exports.enrollTraining = async (req, res) => {
  try {
    const { training_id } = req.body;
    const user_id = req?.user?.id;

    if (!training_id || !user_id) {
      return res.status(400).json({ error: "training_id and authenticated user are required" });
    }

    const result = await Attendance.enrollTraining({ training_id, user_id });
    return res.json({
      success: true,
      message: "Enrolled successfully",
      ...result,
    });
  } catch (error) {
    console.error("Enroll training error:", error);
    return res.status(500).json({ error: "Failed to enroll training" });
  }
};

exports.getEnrollmentStatus = async (req, res) => {
  try {
    const { training_id } = req.query;
    const user_id = req?.user?.id;

    if (!training_id || !user_id) {
      return res.status(400).json({ error: "training_id and authenticated user are required" });
    }

    const result = await Attendance.getEnrollmentStatus({ training_id, user_id });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("Get enrollment status error:", error);
    return res.status(500).json({ error: "Failed to fetch enrollment status" });
  }
};
