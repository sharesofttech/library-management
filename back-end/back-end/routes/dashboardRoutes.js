const router = require("express").Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { getStats } = require("../controllers/dashboardController");
router.get("/dashboard/stats", verifyToken, requireRole("admin", "librarian"), getStats);
module.exports = router;
