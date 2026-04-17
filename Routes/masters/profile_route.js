const express = require('express');
const router = express.Router();
const verifyToken = require('../../Middleware/authmiddleware');
const profileController = require("../../controllers/masters/profile_controller");
const profileUpload = require("../../Middleware/profileUpload");

// Change getMyProfile -> getProfile
router.get('/me', verifyToken, profileController.getProfile); 

// Change updateMyProfile -> updateProfile
router.put('/update', verifyToken, profileController.updateProfile); 

// NEW: Route for photo upload
// "photo" must match the key used in your frontend FormData
router.post('/upload-photo', verifyToken, profileUpload.single('photo'), profileController.uploadPhoto);

module.exports = router;