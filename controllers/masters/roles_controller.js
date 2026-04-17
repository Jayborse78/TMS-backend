const rolesmodel=require('../../model/masters/roles_model');
// Get all roles
const getroles=async (req,res)=>{
    try{
        const response= await rolesmodel.getallroles();
        res.json(response);
    }catch (err) {
    console.log("Error in fetching data from database", err);
    res.status(500).json({ message: "Internal server error" });
}
}

const getrolebyId= async(req,res)=>{
    const {Id}=req.params;  
    try{
        const response = await rolesmodel.getRoleById(Id);

if (!response) {
  return res.status(404).json({ message: "Role not found" });
}

res.json(response);

    }catch(err){
    console.log("Error in fetching data from database",err);
    res.status(500).json({ message: "Internal server error" });
}

}

const createRole= async(req,res)=>{
  const {role_id,role_name, role_description}=req.body; 
  const status = Number(req.body.status) === 0 ? 0 : 1;
    if (!role_id || !role_name) {
  return res.status(400).json({ message: "Role ID and Role Name are required" });
}

    try{
        const created_by=req.user.id;
      const response= await rolesmodel.createRole(role_id, role_name, role_description, status, created_by);
        // 
        res.status(201).json({
  success: true,
  id: response[0],
  message: "Role created successfully"
});

    }catch(err){
    console.log("Error in inserting data into database",err);
    res.status(500).json({ message: "Internal server error" });
}

}

const deleteRole = async (req, res) => {
  const { Id } = req.params;        
    try{
      const response = await rolesmodel.deleteRole(Id);

if (response === 0) {
  return res.status(404).json({ message: "Role not found" });
}

// res.json({
//   id: Id,
//   message: "Role deleted successfully"
// });

res.status(200).json({
  success: true,
  id: Id,
  message: "Role deleted successfully"
});


    }catch(err){
    console.log("Error in deleting data from database",err);    
    res.status(500).json({ message: "Internal server error" });
}

}

const updateRole = async (req, res) => {
  const { Id } = req.params;
  const { role_id, role_name, role_description, } = req.body;
  const status =
    req.body.status === undefined || req.body.status === null || req.body.status === ""
      ? undefined
      : Number(req.body.status) === 0
        ? 0
        : 1;
  if (!role_id || !role_name) {
  return res.status(400).json({ message: "Role ID and Role Name are required" });
}

  try{
        const updated_by=req.user.id;
        // const updated_date= new Date().toISOString();
        const updated_date = new Date();

        const response = await rolesmodel.updateRole(
  Id,
  role_id,
  role_name,
  role_description,
  status,
  updated_by,
  updated_date
);

if (response === 0) {
  return res.status(404).json({ message: "Role not found" });
}

// res.json({
//   id: Id,
//   message: "Role updated successfully"
// });

res.status(200).json({
  success: true,
  id: Id,
  message: "Role updated successfully"
});


    }catch(err){
    console.log("Error in updating data from database",err);    
    res.status(500).json({ message: "Internal server error" });
}

}

module.exports={getroles, getrolebyId, createRole, deleteRole, updateRole};