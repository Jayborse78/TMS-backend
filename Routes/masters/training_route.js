const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/masters/training_controller");
const verifyToken = require("../../Middleware/authmiddleware");

router.get("/", ctrl.getTrainings);
router.get("/trainer-trainings", verifyToken, ctrl.getTrainingsByTrainerId);
router.post("/", ctrl.createTraining);
router.put("/:id", ctrl.updateTraining);
router.delete("/:id", ctrl.deleteTraining);

module.exports = router;