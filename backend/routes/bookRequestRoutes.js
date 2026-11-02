
const router = require("express").Router();
const controller = require("../controllers/bookRequestController");

const {
  verifyToken,
  requireRole,
} = require("../middleware/authMiddleware");

// Member - Request a book
router.post(
  "/book-requests",
  verifyToken,
  requireRole("user"),
  controller.createRequest
);

// Member - View own requests
router.get(
  "/book-requests/my",
  verifyToken,
  requireRole("user"),
  controller.getMyRequests
);

// Member - Cancel own pending request
router.patch(
  "/book-requests/:id/cancel",
  verifyToken,
  requireRole("user"),
  controller.cancelRequest
);

// Admin / Librarian - Pending count
router.get(
  "/book-requests/pending-count",
  verifyToken,
  requireRole("admin", "librarian"),
  controller.getPendingCount
);

// Admin / Librarian - All requests
router.get(
  "/book-requests",
  verifyToken,
  requireRole("admin", "librarian"),
  controller.getAllRequests
);

// Admin / Librarian - Approve / Reject
router.patch(
  "/book-requests/:id/status",
  verifyToken,
  requireRole("admin", "librarian"),
  controller.updateRequestStatus
);

module.exports = router;
