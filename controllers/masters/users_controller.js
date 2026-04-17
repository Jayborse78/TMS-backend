const usermodel = require('../../model/masters/users_model');

const getUsers = async (req, res) => {
  try {
    const response = await usermodel.getAllUsers();
    res.json(response);
  } catch (err) {
    console.log("Error fetching users", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      emp_id,
      name,
      email,
      role_id,
      dept_id,
      dept_ids,
      education,
      experience,
      username,
      password,
      status
    } = req.body;

    const resolvedDeptId = Number.isInteger(Number(dept_id)) && Number(dept_id) > 0
      ? Number(dept_id)
      : Array.isArray(dept_ids) && Number(dept_ids[0]) > 0
        ? Number(dept_ids[0])
        : null;

    const created_by = req.user.id;   // ✅ FIX

    await usermodel.createUser({
      emp_id,
      name,
      email,
      role_id,
      dept_id: resolvedDeptId,
      dept_ids,
      education,
      experience,
      username,
      password,
      status,
      created_by,
      updated_by: created_by
    });

    res.json({ message: "User created successfully" });
  } catch (err) {
    console.log("Error creating user", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

   const {
  emp_id,
  name,
  email,
  role_id,
  dept_id,
  dept_ids,
  education,
  experience,
  username,
  password,
  status
} = req.body;

const resolvedDeptId = Number.isInteger(Number(dept_id)) && Number(dept_id) > 0
  ? Number(dept_id)
  : Array.isArray(dept_ids) && Number(dept_ids[0]) > 0
    ? Number(dept_ids[0])
    : null;

await usermodel.updateUser(id, {
  emp_id,
  name,
  email,
  role_id,
  dept_id: resolvedDeptId,
  dept_ids,
  education,
  experience,
  username,
  password,
  status,
  updated_by: req.user.id
});

    res.json({ message: "User updated successfully" });

  } catch (err) {
    console.log("Error updating user", err);
    res.status(500).json({ message: "Server error" });
  }
};


const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await usermodel.deleteUser(id);

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.log("Error deleting user", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
