const express=require('express');   
// const { getdepartments, getSingleDepartments, deleteDepartment, departmentData, updateDepartment } = require('../../controllers/masters/department_controller');
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../../controllers/masters/department_controller');

const Router=express.Router();

Router.route('/').get(getDepartments);
Router.route('/').post(createDepartment);
Router.route('/:Id').get(getDepartmentById);
Router.route('/:Id').put(updateDepartment);
Router.route('/:Id').delete(deleteDepartment);

module.exports=Router;