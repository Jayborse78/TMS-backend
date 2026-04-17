require("dotenv").config();   // ✅ ADD THIS LINE
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error('[AUTH] Token missing - No authorization header');
    return res.status(401).json({ message: "Token missing" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.error('[AUTH] Invalid format - Missing Bearer prefix');
    return res.status(401).json({ message: "Invalid authorization format" });
  }

  const token = authHeader.split(" ")[1];

  if (!process.env.MYKEY) {
    console.error('[AUTH] MYKEY env variable not set!');
    return res.status(500).json({ message: "Server configuration error" });
  }

  jwt.verify(token, process.env.MYKEY, (err, decoded) => {
    if (err) {
      console.error('[AUTH] Token verification failed:', err.message);
      return res.status(401).json({ message: "Invalid token", error: err.message });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    next();
  });
};

// console.log("MYKEY from env:", process.env.MYKEY);


module.exports = verifyToken;
