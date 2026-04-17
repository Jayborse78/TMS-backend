// const express=require('express');
// const Router=express.Router(); 
// const { getskills , getskillbyId , createSkill } = require('../../controllers/masters/skill_controller');
// const { deleteSkill } = require('../../controllers/masters/skill_controller');
// const { updateSkill } = require('../../controllers/masters/skill_controller');



// Router.route('/').get(getskills);
// Router.route('/:Id').get(getskillbyId);
// Router.route('/').post(createSkill);
// Router.route('/:Id').put(updateSkill); 
// Router.route('/:Id').delete(deleteSkill);





// module.exports=Router;


const express = require('express');
const Router = express.Router();

const {
  getskills,
  getskillbyId,
  createSkill,
  updateSkill,
  deleteSkill
} = require('../../controllers/masters/skill_controller');

// Get all skills
Router.get('/', getskills);

// Get skill by id
Router.get('/:id', getskillbyId);

// Create skill
Router.post('/', createSkill);

// Update skill
Router.put('/:id', updateSkill);

// Delete skill
Router.delete('/:id', deleteSkill);

module.exports = Router;
