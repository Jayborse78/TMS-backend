const express = require('express');    
const mysql = require('mysql2');   
const Router=express.Router();
const { LoginCheck } = require('../../controllers/auth/login_controller');
const verifyToken = require('../../Middleware/authmiddleware');
const {
	requestPasswordReset,
	getPendingResetRequests,
	approveResetRequest,
} = require('../../controllers/auth/password_reset_controller');


Router.route('/').post(LoginCheck)
Router.post('/forgot-password-request', requestPasswordReset);
Router.get('/password-reset-requests/pending', verifyToken, getPendingResetRequests);
Router.post('/password-reset-requests/:id/approve', verifyToken, approveResetRequest);

module.exports = Router;