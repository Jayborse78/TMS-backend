const Training = require("../../model/masters/training_model");


exports.getTrainings = async (req, res) => {
  try {
    const data = await Training.getAll();
    res.json(data);
    
  } catch (err) {
    console.error("Training list error:", err);
    res.status(500).json({ error: "Failed to fetch trainings" });
  }
};

exports.getTrainingsByTrainerId = async (req, res) => {
  try {
    const trainerId = req.user.id;  
  
    const data = await Training.getByTrainerId(trainerId);
    res.json(data);
    
  } catch (err) {
    console.error("Training list by trainer ID error:", err);
    res.status(500).json({ error: "Failed to fetch trainings for trainer" });
  }
};

exports.createTraining = async (req, res) => {
  try {
    const id = await Training.create(req.body);
    res.json({ success: true, id });
  } catch (err) {
    if (err?.message === "TRAINER_ID_REQUIRED") {
      return res.status(400).json({ error: "trainer_id is required" });
    }
    if (err?.message === "TRAINER_ID_COLUMN_MISSING") {
      return res.status(500).json({ error: "trainer_id column missing in tg_training_list" });
    }
    console.error("Create training error:", err);
    res.status(500).json({ error: "Failed to create training" });
  }
};

exports.updateTraining = async (req, res) => {
  try {
    await Training.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    if (err?.message === "TRAINER_ID_REQUIRED") {
      return res.status(400).json({ error: "trainer_id is required" });
    }
    if (err?.message === "TRAINER_ID_COLUMN_MISSING") {
      return res.status(500).json({ error: "trainer_id column missing in tg_training_list" });
    }
    console.error("Update training error:", err);
    res.status(500).json({ error: "Failed to update training" });
  }
};

exports.deleteTraining = async (req, res) => {
  try {
    await Training.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete training error:", err);
    res.status(500).json({ error: "Failed to delete training" });
  }
};