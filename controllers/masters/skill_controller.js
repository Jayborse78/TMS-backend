// const Skillmodel=require('../../model/masters/skill_model');
// // const { get } = require('../../Routes/masters/roles_route');
// // Get all skills
// const getskills=async (req,res)=>{  
//     try{
//         const responce= await Skillmodel.getallskills();
//         res.json(responce);
//     }catch (err) {
//   console.error("Error fetching skills:", err);
//   res.status(500).json({ message: "Server error" });
// }

// }

// const getskillbyId= async(req,res)=>{
//     const {Id}=req.params;  
//     try{
//         const responce=await Skillmodel.getSkillById(Id);
//         res.json(responce);
//     }catch (err) {
//   console.error("Error fetching skills:", err);
//   res.status(500).json({ message: "Server error" });
// }

// }

// const createSkill= async(req,res)=>{
//     const {dept_id, skill_code, skill_name, skill_cat, skill_dept}=req.body;
//     try{
//         const role_id = req.user.id;
//         const created_by=req.user.id;
//         const responce= await Skillmodel.createSkill(role_id, dept_id, skill_code, skill_name, skill_cat, skill_dept, created_by);    
//         res.json({
//             id: responce[0],
//             message: "Skill created successfully"
//         });
//     }catch(err){
//         console.log("Error in inserting data into database",err);
//     }       
// }

// const deleteSkill = async (req, res) => {

//     const { Id } = req.params;
//     try{
//         const responce= await Skillmodel.deleteSkill(Id);   
//         res.json({
//             id: Id,
//             message: "Skill deleted successfully"
//         });
//     }catch(err){
//         console.log("Error in deleting data from database",err);    
//     }
// }

// const updateSkill = async (req, res) => {  
//     const { Id } = req.params;
//     const {dept_id, skill_code, skill_name, skill_cat, skill_dept} = req.body;
//     try{
//         const role_id = req.user.id;
//         const updated_by=req.user.id;
//         const updated_date= new Date().toISOString();   
//         const response=await Skillmodel.updateSkill(Id, role_id, dept_id, skill_code, skill_name, skill_cat, skill_dept, updated_by, updated_date);
//         res.json({
//             id: Id,
//             message: "Skill updated successfully"
//         });
//     }
//     catch(err){
//         console.log("Error in updating data from database",err);    
//     }       
// }


// module.exports={getskills,getskillbyId,createSkill,deleteSkill,updateSkill};


const Skillmodel = require('../../model/masters/skill_model');

// Get all skills
const getskills = async (req, res) => {
  try {
    const response = await Skillmodel.getallskills();
    res.json(response);
  } catch (err) {
    console.error("Error fetching skills:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get skill by ID
const getskillbyId = async (req, res) => {
  const { id } = req.params;
  try {
    // const response = await Skillmodel.getSkillById(id);
    // res.json(response);
    const response = await Skillmodel.getSkillById(id);

if (!response) {
  return res.status(404).json({ message: "Skill not found" });
}

res.json(response);

  } catch (err) {
    console.error("Error fetching skill:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create skill
const createSkill = async (req, res) => {
  const { dept_id, skill_code, skill_name, skill_cat, skill_dept, skill_desc } = req.body;
  const status = Number(req.body.status) === 0 ? 0 : 1;

  if (!skill_code || !skill_name) {
    return res.status(400).json({ message: "Skill code and name required" });
  }

  try {
    const role_id = req.user.id;
    const created_by = req.user.id;

    const response = await Skillmodel.createSkill(
      role_id,
      dept_id,
      skill_code,
      skill_name,
      skill_cat,
      skill_dept,
      skill_desc,
      status,
      created_by
    );

    // res.json({
    //   id: response[0],
    //   message: "Skill created successfully"
    // });
res.status(201).json({
  id: response[0],
  message: "Skill created successfully"
});


  } catch (err) {
    console.error("Error creating skill:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update skill
const updateSkill = async (req, res) => {
  const { id } = req.params;
  const { dept_id, skill_code, skill_name, skill_cat, skill_dept, skill_desc } = req.body;
  const status =
    req.body.status === undefined || req.body.status === null || req.body.status === ""
      ? undefined
      : Number(req.body.status) === 0
        ? 0
        : 1;

  try {
    const role_id = req.user.id;
    const updated_by = req.user.id;
    const updated_date = new Date().toISOString();

    await Skillmodel.updateSkill(
      id,
      role_id,
      dept_id,
      skill_code,
      skill_name,
      skill_cat,
      skill_dept,
      skill_desc,
      status,
      updated_by,
      updated_date
    );

    res.json({
      id,
      message: "Skill updated successfully"
    });
  } catch (err) {
    console.error("Error updating skill:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete skill
const deleteSkill = async (req, res) => {
  const { id } = req.params;

  try {
    await Skillmodel.deleteSkill(id);
    res.json({
      id,
      message: "Skill deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting skill:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getskills,
  getskillbyId,
  createSkill,
  updateSkill,
  deleteSkill
};
