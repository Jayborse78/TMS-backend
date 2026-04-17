require('dotenv').config();
const jwt = require('jsonwebtoken');
const authorized = require('../../model/auth/auth_model');

// Login check controller
const LoginCheck = async (req, res) => {
  const { username, password } = req.body;
  try {
    console.log("Received login request for username:", username);
    const result = await authorized.getRoleByUsername(username, password);
    if (!result) {
      console.log(`Invalid username or password ${process.env.MYKEY}`);

      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Password Type:", typeof password);

    const token = jwt.sign(
      {
        id: result.id,
        username: username,
        role: result.role_id   // this is now 2, 3, 4
      },
      process.env.MYKEY,
      { expiresIn: "24h" }
    );
    // Add trainerId and role_id to response for frontend
    return res.json({
      token,
      message: "Login Successful",
      role: result.role_name,
      trainerId: result.trainer_id
    });

  } catch (err) {
    console.log("Error in fetching data from database", err);
    res.status(500).json({ message: "Internal server error" });
  }
}




module.exports = { LoginCheck };