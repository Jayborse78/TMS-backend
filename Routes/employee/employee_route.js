
const express = require('express');
const { getProfile, updateProfile, getMyTrainings, getMyTrainerTrainings, getDashboardCounts, getMyExams, getMyCertificates } = require('../../controllers/employee/employee_controller');
const router = express.Router();



// Get all employees
router.get('/', getProfile);
router.put('/', updateProfile);
router.get('/trainings', getMyTrainings);
router.get('/trainer-trainings', getMyTrainerTrainings);
router.get('/dashboard-counts', getDashboardCounts);

// Get eligible exams for employee
router.get('/my-exams', getMyExams);

// Get certificates for employee
router.get('/my-certificates', getMyCertificates);



module.exports=router;