
const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/masters/course_controller");

router.get("/", ctrl.getCourses);
router.post("/subtopics/:subtopicId/complete", ctrl.completeSubtopic);
router.post("/", ctrl.createCourse);
router.put("/:id", ctrl.updateCourse);
router.delete("/:id", ctrl.deleteCourse);

module.exports = router;
