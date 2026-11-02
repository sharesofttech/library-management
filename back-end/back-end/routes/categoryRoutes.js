const router = require("express").Router();
const controller = require("../controllers/categoryController");
const { verifyToken, requireRole, requireApprovedRenter } = require("../middleware/authMiddleware");

router.get("/renter-categories", verifyToken, requireRole("user"), requireApprovedRenter, controller.getRenterCategories);
router.use("/categories", verifyToken, requireRole("admin", "librarian"));
router.get("/categories", controller.getCategories);
router.post("/categories", controller.createCategory);
router.get("/categories/:id", controller.validateId, controller.getCategoryById);
router.put("/categories/:id", controller.validateId, controller.updateCategory);
router.delete("/categories/:id", controller.validateId, controller.deleteCategory);
module.exports = router;
