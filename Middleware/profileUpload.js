const fs = require("fs");
const multer = require("multer");
const path = require("path");

// Targets root/uploads/profile_photos
const uploadDir = path.join(__dirname, "..", "uploads", "profile_photos");

// Ensure the directory exists automatically
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.error("Directory Creation Error:", err);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Unique filename: profile-timestamp-random.extension
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only images are allowed!"), false);
        }
    }
});

module.exports = upload;