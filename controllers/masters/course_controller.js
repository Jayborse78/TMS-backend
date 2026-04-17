

const Course = require("../../model/masters/course_model");

// GET all courses with topics + subtopics
const getCourses = async (req, res) => {
  try {
    const data = await Course.getAllCourses(req.user?.id);
    res.json(data);
  } catch (err) {
    console.error("Get courses error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const completeSubtopic = async (req, res) => {
  try {
    const employeeId = req.user?.id;
    const subtopicId = req.params.subtopicId;

    const result = await Course.markSubtopicCompleted({ employeeId, subtopicId });
    res.json({ message: "Subtopic marked completed", data: result });
  } catch (err) {
    if (String(err.message).toLowerCase().includes("not found")) {
      return res.status(404).json({ message: err.message });
    }
    if (String(err.message).toLowerCase().includes("invalid")) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Complete subtopic error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE course
const createCourse = async (req, res) => {
  try {
    const result = await Course.createCourse(req.body);
    res.json({ message: "Course created", id: result });
  } catch (err) {
    console.error("Create course error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE course
const updateCourse = async (req, res) => {
  try {
    await Course.updateCourse(req.params.id, req.body);
    res.json({ message: "Course updated" });
  } catch (err) {
    console.error("Update course error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE
const deleteCourse = async (req, res) => {
  try {
    await Course.deleteCourse(req.params.id);
    res.json({ message: "Course deleted" });
  } catch (err) {
    console.error("Delete course error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCourses,
  completeSubtopic,
  createCourse,
  updateCourse,
  deleteCourse,
};
