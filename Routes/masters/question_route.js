const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/masters/question_controller");
const db = require("../../DB/knex"); // Required for the inline training route

router.get("/training/get-all", async (req, res) => {
  try {
    const data = await db("tg_training_list")
      .where("is_deleted", 0)
      .select("id", "name"); // 'name' matches your database column
    res.json(data);
  } catch (e) {
    console.error("Training Fetch Error:", e);
    res.status(500).json({ message: "Server error fetching trainings" });
  }
});

router.get("/rows", ctrl.getRows);
router.post("/rows", ctrl.createRow);
router.delete("/rows/:id", ctrl.deleteRow);
router.put("/rows/:id/status", ctrl.updateRowStatus);


router.get("/list", ctrl.getQuestions);
router.post("/list", ctrl.addQuestion);
router.delete("/list/:id", ctrl.deleteQuestion);
router.put("/list/:id", ctrl.updateQuestion);

// Excel upload for bulk question insert
router.post("/upload-excel", ctrl.uploadQuestionsExcel);

module.exports = router;