const router = require("express").Router();

const {
  verifyToken,
  requireRole,
} = require("../middleware/authMiddleware");

const controller = require("../controllers/bookIssueController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const importCsv = (req, res, next) => upload.single("file")(req, res, error => {
  if (error) return res.status(400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "CSV file must be 2 MB or smaller" : "Unable to read uploaded CSV file" });
  next();
});

router.post("/borrowings/import", verifyToken, requireRole("admin", "librarian"), importCsv, controller.importBorrowings);

router.post(
  "/book-issues",
  verifyToken,
  requireRole("admin", "librarian"),
  controller.issueBook
);
router.get(
  "/borrowings/export",
  verifyToken,
  requireRole("admin", "librarian"),
  controller.exportBorrowings
);
router.get(
  "/borrowings",
  verifyToken,
  requireRole("admin", "librarian"),
  controller.getBorrowings
);

module.exports = router;
