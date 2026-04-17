// const express=require('express');
// const Router=express.Router(); 
// const { getroles , getrolebyId , createRole } = require('../../controllers/masters/roles_controller');
// const { deleteRole } = require('../../controllers/masters/roles_controller');
// const { updateRole } = require('../../controllers/masters/roles_controller');


// Router.route('/').get(getroles);
// Router.route('/:Id').get(getrolebyId);
// Router.route('/').post(createRole);
// Router.route('/:Id').put(updateRole); 
// Router.route('/:Id').delete(deleteRole);


// module.exports=Router;

const express = require('express');
const Router = express.Router();

const {
  getroles,
  getrolebyId,
  createRole,
  deleteRole,
  updateRole
} = require('../../controllers/masters/roles_controller');

Router.get('/', getroles);
Router.get('/:Id', getrolebyId);
Router.post('/', createRole);
Router.put('/:Id', updateRole);
Router.delete('/:Id', deleteRole);

module.exports = Router;
