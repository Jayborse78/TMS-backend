const fs = require("fs");
const multer = require("multer");
const path = require("path");

// Ensure upload directory exists (avoids multer errors when folder missing)
const uploadDir = path.join(__dirname, "..", "uploads", "certificates");
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (err) {
  console.error("Failed to create upload directory:", uploadDir, err);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

module.exports = upload;