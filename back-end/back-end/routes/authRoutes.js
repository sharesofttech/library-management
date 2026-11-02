const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const applicationController = require("../controllers/applicationController");
const roleApplicationController = require("../controllers/roleApplicationController");
const registrationVerificationController = require("../controllers/registrationVerificationController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/registration-verification/start", registrationVerificationController.start);
router.post("/registration-verification/verify", registrationVerificationController.verify);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/admin/applications", verifyToken, requireRole("admin"), applicationController.getPendingApplications);
router.patch("/admin/applications/:id", verifyToken, requireRole("admin"), applicationController.reviewApplication);
router.post("/role-applications", verifyToken, requireRole("user"), roleApplicationController.create);
router.get("/role-applications/mine", verifyToken, requireRole("user"), roleApplicationController.getMine);
router.patch("/admin/role-applications/:id", verifyToken, requireRole("admin"), roleApplicationController.review);

module.exports = router;
