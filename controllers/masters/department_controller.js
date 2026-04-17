
const departmentModel = require('../../model/masters/department_model');

// Get all departments
const getDepartments = async (req, res) => {
  try {
    const response = await departmentModel.getallDepartments();
    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single department
const getDepartmentById = async (req, res) => {
  const { Id } = req.params;
  try {
    const response = await departmentModel.getDepartmentById(Id);

    if (!response || response.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.status(200).json(response[0]);
  } catch (err) {
    console.error("Error fetching department:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create department
const createDepartment = async (req, res) => {
//   const { dept_code, dept_name, dept_desc } = req.body;
const dept_code = req.body.dept_code?.trim();
const dept_name = req.body.dept_name?.trim();
const dept_desc = req.body.dept_desc?.trim();
const status = Number(req.body.status) === 0 ? 0 : 1;


  if (!dept_code || !dept_name)
// if (!dept_code || dept_code.length === 0 || !dept_name || dept_name.length === 0)
 {
    return res.status(400).json({
      message: "Department code and name are required"
    });
  }

  try {
    const created_by = req.user.id;

    const response = await departmentModel.createDepartment(
      dept_code,
      dept_name,
      dept_desc,
      status,
      created_by
    );
res.status(201).json({
  success: true,
  message: "Department created successfully",
  data: { id: response[0] }
});


  } catch (err) {
    console.error("Error creating department:", err);
    res.status(500).json({ message: "Error creating department:" });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  const { Id } = req.params;
//   const { dept_code, dept_name, dept_desc } = req.body;
const dept_code = req.body.dept_code?.trim();
const dept_name = req.body.dept_name?.trim();
const dept_desc = req.body.dept_desc?.trim();
const status =
  req.body.status === undefined || req.body.status === null || req.body.status === ""
    ? undefined
    : Number(req.body.status) === 0
      ? 0
      : 1;


  if (!dept_code || !dept_name)
// if (!dept_code || dept_code.length === 0 || !dept_name || dept_name.length === 0)

 {
    return res.status(400).json({
      message: "Department code and name are required"
    });
  }

  try {
    const updated_by = req.user.id;
    const updated_date = new Date().toISOString();

    const affected = await departmentModel.updateDepartment(
  Id,
  dept_code,
  dept_name,
  dept_desc,
      updated_by,
      status
);


    if (!affected) {
      return res.status(404).json({ message: "Department not found" });
    }

res.status(200).json({
  success: true,
  message: "Department updated successfully",
  data: { id: Id }
});

  } catch (err) {
    // console.error("Error updating department:", err);
    console.error("Error updating department:", { Id, err });

    res.status(500).json({ message: "Error updating department:" });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  const { Id } = req.params;

  try {
    const affected = await departmentModel.deleteDepartment(Id);

    if (!affected) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.status(200).json({
  success: true,
  message: "Department deleted successfully",
  data: { id: Id }
});


  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
