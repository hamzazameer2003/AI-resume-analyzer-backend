const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const { configurePassport } = require("./utils/passport");

const authRoutes = require("./routes/auth.routes");
const resumeAnalysisRoutes = require("./routes/resumeAnalysis.routes");
const resumeGeneratorRoutes = require("./routes/resumeGenerator.routes");
const trendingJobsRoutes = require("./routes/trendingJobs.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const careerRoutes = require("./routes/career.routes");
const path = require("path");

const app = express();
configurePassport();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  session({
    secret: process.env.JWT_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/resume-analysis", resumeAnalysisRoutes);
app.use("/api/resume-generator", resumeGeneratorRoutes);
app.use("/api/trending-jobs", trendingJobsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/career", careerRoutes);

// Error handler (including multer)
app.use((err, req, res, next) => {
  if (err) {
    const status = err.statusCode || err.status || 500;
    return res.status(status).json({ message: err.message || "Request error" });
  }
  return next();
});

module.exports = app;
