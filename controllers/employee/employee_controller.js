const employee=require('../../model/employee/employee_model');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await employee.getProfileById(userId);

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(profile);
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMyTrainings = async (req, res) => {
  try {
    const userId = req.user.id;
    const trainings = await employee.getTrainingsByEmployeeId(userId);
    return res.json(trainings);
  } catch (error) {
    console.error("My trainings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getMyTrainerTrainings = async (req, res) => {
  try {
    const userId = req.user.id;
    const trainings = await employee.getTrainingsByTrainerId(userId);
    return res.json(trainings);
  } catch (error) {
    console.error("My trainer trainings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getDashboardCounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const counts = await employee.getDashboardCountsByEmployeeId(userId);
    
    return res.json(counts);
  } catch (error) {
    console.error('Dashboard counts error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, education, experience } = req.body;

    const payload = {
      updated_by: userId
    };

    if (name !== undefined) payload.name = name;
    if (email !== undefined) payload.email = email;
    if (education !== undefined) payload.education = education;
    if (experience !== undefined) payload.experience = experience;

    const updated = await employee.updateProfileById(userId, payload);

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await employee.getProfileById(userId);
    return res.json({
      message: "Profile updated successfully",
      profile
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all exams for trainings assigned to the logged-in employee
const getMyExams = async (req, res) => {
  try {
    const userId = req.user.id;
    const exams = await employee.getExamsByEmployeeId(userId);
    return res.json({ success: true, data: exams });
  } catch (error) {
    console.error("Get my exams error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all certificates for trainings assigned to the logged-in employee
const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const certificates = await employee.getCertificatesByEmployeeId(userId);
    return res.json({ success: true, data: certificates });
  } catch (error) {
    console.error("Get my certificates error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports={
  getProfile,
  updateProfile,
  getMyTrainings,
  getMyTrainerTrainings,
  getDashboardCounts,
  getMyExams,
  getMyCertificates
};