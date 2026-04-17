const TrainingCalendar = require("../../model/masters/calendar_model");

exports.getUpcomingSessions = async (req, res) => {
  try {
    // If using authentication, req.user.id should be the trainer's ID
    const trainerId = req.user.id;
    const sessions = await TrainingCalendar.getUpcomingSessions(trainerId);
   
    res.json(sessions);
  } catch (err) {
    console.error("Error fetching upcoming sessions:", err);
    res.status(500).json({ error: "Failed to fetch upcoming sessions" });
  }
};


