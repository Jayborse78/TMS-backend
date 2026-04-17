const multer = require('multer');
const path = require('path');
const Question = require("../../model/masters/question_model");

// Multer setup for memory storage (no file saved to disk)
const upload = multer({ storage: multer.memoryStorage() });

exports.getRows = async (req, res) => {
  try {
    // Calls the model which aliases DB 'name' as 'training_name'
    const data = await Question.getAllQuestionCourses();
    res.json(data);
  } catch (e) {
    console.error("getRows Error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createRow = async (req, res) => {
  try {
    const id = await Question.createQuestionCourse(req.body);
    res.json({ success: true, id });
  } catch (err) {
    if (err.message === "ROW_EXISTS") {
      return res.status(400).json({
        success: false,
        message: "Training already created for this Level and Type"
      });
    }
    console.error("createRow Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    // ⭐ Changed course_id to training_id to match your DB and Frontend
    const { training_id, level, type } = req.query;

    const data = await Question.getQuestionsByRow(
      training_id,
      level,
      type
    );

    res.json(data);
  } catch (e) {
    console.error("getQuestions error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addQuestion = async (req, res) => {
  try {
    const id = await Question.addQuestion(req.body);
    res.json({ message: "Question added", id });
  } catch (e) {
    console.error("addQuestion Error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    await Question.deleteQuestion(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) {
    console.error("deleteQuestion Error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const id = req.params.id;
    await Question.updateQuestion(id, req.body);
    res.json({ message: "Question updated" });
  } catch (e) {
    console.error("updateQuestion Error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteRow = async (req, res) => {
  try {
    // ⭐ Updated to use the correct model method name
    await Question.deleteRow(req.params.id);
    res.json({ message: "Row deleted" });
  } catch (e) {
    console.error("deleteRow error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateRowStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const normalizedStatus = Number(status) === 0 ? 0 : 1;

    await Question.updateRowStatus(req.params.id, normalizedStatus);
    res.json({ message: "Row status updated" });
  } catch (e) {
    console.error("updateRowStatus error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

// Controller: Upload Excel and bulk insert questions
exports.uploadQuestionsExcel = [
  upload.single('file'), // expects field name 'file'
  async (req, res) => {
    try {
      const { training_id, level, type } = req.body;
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      if (!training_id || !level || !type) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const count = await Question.bulkUploadQuestionsFromExcel(
        req.file.buffer,
        training_id,
        level,
        type,
        req.user?.id 
      );
      res.json({ message: `Uploaded ${count} questions successfully` });
    } catch (err) {
      console.error('Excel upload error:', err);
      res.status(500).json({ message: 'Server error during Excel upload' });
    }
  }
];