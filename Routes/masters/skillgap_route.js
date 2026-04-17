const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/masters/skillgap_controller');

// main endpoints
router.get('/', ctrl.getSkillGaps);
router.post('/', ctrl.createSkillGap);
router.put('/:empId', ctrl.updateSkillGap);
router.delete('/:empId', ctrl.deleteSkillGap);

// helper for frontend drop-down
router.get('/skills-by-department/:deptId', ctrl.getSkillsByDepartment);

module.exports = router;
