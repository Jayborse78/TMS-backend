const express = require('express');
const Router = express.Router();
const verifyToken = require('../../Middleware/authmiddleware');
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../../controllers/masters/users_controller');

Router.get('/', verifyToken, getUsers);
Router.post('/', verifyToken, createUser);
Router.put('/:id', verifyToken, updateUser);
Router.delete('/:id', verifyToken, deleteUser);

module.exports = Router;
