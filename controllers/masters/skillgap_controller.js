const SkillGap = require('../../model/masters/skillgap_model');

exports.getSkillGaps = async (req, res) => {
  try {
    const data = await SkillGap.getAll();
    res.json(data);
  } catch (err) {
    console.error('Error fetching skill gap data:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch skill gap data' });
  }
};

exports.createSkillGap = async (req, res) => {
  try {
    const { emp_id, dept_id, skill_names } = req.body;
    if (!emp_id) {
      return res.status(400).json({ success: false, message: 'emp_id is required' });
    }
    const normalizedSkills = Array.isArray(skill_names)
      ? skill_names
      : skill_names
        ? [skill_names]
        : [];
    await SkillGap.create({ emp_id, dept_id, skill_names: normalizedSkills, created_by: req.user?.id || '' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating skill gap entry:', err);
    res.status(500).json({ success: false, message: 'Failed to create skill gap entry' });
  }
};

// update all skills for a particular employee
exports.updateSkillGap = async (req, res) => {
  try {
    const empId = req.params.empId;
    const { skill_names, dept_id } = req.body;
    if (!empId) {
      return res.status(400).json({ success: false, message: 'empId is required' });
    }
    const normalizedSkills = Array.isArray(skill_names)
      ? skill_names
      : skill_names
        ? [skill_names]
        : [];
    await SkillGap.update({ emp_id: empId, dept_id, skill_names: normalizedSkills, updated_by: req.user?.id || '' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating skill gap entry:', err);
    res.status(500).json({ success: false, message: 'Failed to update skill gap entry' });
  }
};

exports.deleteSkillGap = async (req, res) => {
  try {
    const empId = req.params.empId;
    if (!empId) {
      return res.status(400).json({ success: false, message: 'empId is required' });
    }
    await SkillGap.deleteByEmployee(empId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting skill gap entry:', err);
    res.status(500).json({ success: false, message: 'Failed to delete skill gap entry' });
  }
};

exports.getSkillsByDepartment = async (req, res) => {
  try {
    const deptId = req.params.deptId;
    if (!deptId) {
      return res.status(400).json({ success: false, message: 'Department id required' });
    }
    const skills = await SkillGap.getSkillsByDepartment(deptId);
    res.json(skills);
  } catch (err) {
    console.error('Error fetching skills by department:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch skills' });
  }
};
