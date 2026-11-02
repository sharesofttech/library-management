const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const userManagementAccess = require("../middleware/userManagementAccess");
const staffOnly = [verifyToken, requireRole("admin", "librarian"), userManagementAccess];

// Approved Renters are visible only to Admins and stay separate from pending applications.
router.get("/users/renters", verifyToken, requireRole("admin"), userController.getApprovedRenters);
router.get("/users/renters/:id", verifyToken, requireRole("admin"), userController.getApprovedRenterDetails);


// Get all users by role: GET /api/users/role/:roleName
router.get("/users/role/:roleName", staffOnly, userController.getUsersByRole);

// Get single user: GET /api/users/:id
router.get("/users/:id", staffOnly, userController.getUserById);

// Create user: POST /api/users
router.post("/users", staffOnly, userController.createUser);

// Update user: PUT /api/users/:id
router.put("/users/:id", staffOnly, userController.updateUser);

// Delete user: DELETE /api/users/:id
router.delete("/users/:id", staffOnly, userController.deleteUser);

module.exports = router;

