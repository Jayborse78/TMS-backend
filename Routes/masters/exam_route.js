const express = require("express");
const router = express.Router();
const examController = require("../../controllers/masters/exam_controller");

router.post("/create-auto", examController.createAutoExam);
router.get("/next-code", examController.getNextExamCode);
router.get("/questions", examController.getQuestionsByCourseType);
router.get("/counts", examController.getQuestionCounts);
router.get("/list", examController.getExamList);
router.get("/assessment-overview", examController.getAssessmentOverview);
router.get("/my-statuses", examController.getMyExamStatuses);
router.get("/my-result/:examId", examController.getMyExamResult);
router.post("/submit", examController.submitExam);
router.put("/:id", examController.updateExam);
// Alternate update path (fix for some clients where PUT /:id returns 404)
router.put("/update/:id", examController.updateExam);
// Allow POST to update as well (works around client PUT issues)
router.post("/update/:id", examController.updateExam);

router.delete("/:id", examController.deleteExam);
router.put("/:id/question-count", examController.updateQuestionCount);

//resheduling exam
router.post('/reschedule-exam', examController.rescheduleExam);

// Get all rescheduled exams for the logged-in employee
router.get('/rescheduled', examController.getRescheduledExams);

module.exports = router;
