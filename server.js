
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

app.set('trust proxy', 1);

// =====================
// Core Middleware
// =====================
app.use(express.json());

// Simple request logger for debugging routes
app.use((req, res, next) => {
  console.log('[req]', req.method, req.originalUrl);
  next();
});

// CORS middleware should be before static and all routes
app.use(cors({
  origin: (origin, callback) => {
    // if no origin (e.g. curl or server-to-server) just allow
    if (!origin) return callback(null, true);
    const allowed = [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://localhost:8081",
    ].filter(Boolean);
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: origin not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Serve static files after CORS
app.use("/uploads", express.static("uploads"));
// allow the frontend origin(s) for CORS; during development there may be multiple ports
app.use(cors({
  origin: (origin, callback) => {
    // if no origin (e.g. curl or server-to-server) just allow
    if (!origin) return callback(null, true);
    // const allowed = [
    //   process.env.FRONTEND_URL,
    //   "http://localhost:5173",
    //   "http://localhost:5174",
    //   "http://127.0.0.1:5173",
    //   "http://127.0.0.1:5174",
    //   "http://localhost:8081",
    // ].filter(Boolean);

    const allowed = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8081",
  "http://192.168.1.12:8081", // Add this (Metro Bundler IP)
  "http://192.168.1.12:5000", // Add this
].filter(Boolean);
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: origin not allowed"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));


// =====================
// Health Check
// =====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "TMS API",
    time: new Date().toISOString()
  });
});


// Middleware
const verifyToken = require('./Middleware/authmiddleware');

// Routes
const departments = require('./Routes/masters/department_route');
const authenticate = require('./Routes/auth/auth_route');
const roles = require('./Routes/masters/roles_route');
const skills = require('./Routes/masters/skill_route');
const courses = require('./Routes/masters/course_route');
const questions = require('./Routes/masters/question_route');
const users = require('./Routes/masters/users_route');
const exams = require("./Routes/masters/exam_route");
const certificates = require("./Routes/masters/certificate_route");
const trainingRoutes = require("./Routes/masters/training_route");
const skillgapRoutes = require("./Routes/masters/skillgap_route");
const attendanceRoutes = require("./Routes/masters/attendance_route");
const profile= require('./Routes/masters/profile_route'); 
const dashboardRoute = require('./Routes/masters/dashboard_route'); 
const TrainerDashboardRoute = require('./Routes/masters/dashboard_route'); 

// Employee Routes
const employeeRoutes = require('./Routes/employee/employee_route');


// =====================
// Public Routes
// =====================
app.use('/login', authenticate);

// =====================
// Protected Routes
// =====================
app.use('/departments', verifyToken, departments);
app.use('/roles',  verifyToken, roles);
app.use('/skills',  verifyToken, skills);
app.use('/courses', verifyToken, courses);
app.use('/questions', verifyToken, questions);
app.use('/users', verifyToken, users);
app.use("/api/exam", verifyToken, exams);
app.use("/certificates", verifyToken, certificates);
app.use('/skillgap', verifyToken, skillgapRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/attendance", verifyToken, attendanceRoutes);
app.use("/uploads", express.static("uploads"));
app.use('/api/profile', profile); //Added by Rajani
app.use('/admin', verifyToken, dashboardRoute);
app.use('/trainer', verifyToken, TrainerDashboardRoute); 

app.use('/employee', verifyToken,employeeRoutes);




// =====================
// 404 Handler
// =====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// =====================
// Global Error Handler
// =====================
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// =====================
// Server Start
// =====================
// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`🚀 TMS API running at http://localhost:${PORT}`);
// });

const PORT = process.env.PORT || 5000;

// Listen on 0.0.0.0 to accept connections from your phone's IP
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server covers all interfaces`);
  console.log(`local: http://localhost:${PORT}`);
  console.log(`network: http://192.168.1.12:${PORT}`);
});
