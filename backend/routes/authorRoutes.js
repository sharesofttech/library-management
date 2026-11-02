const router = require("express").Router();
const controller = require("../controllers/authorController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

router.use("/authors", verifyToken, requireRole("admin", "librarian"));
router.get("/authors", controller.getAuthors);
router.post("/authors", controller.createAuthor);
router.get("/authors/:id", controller.validateId, controller.getAuthorById);
router.put("/authors/:id", controller.validateId, controller.updateAuthor);
router.delete("/authors/:id", controller.validateId, controller.deleteAuthor);

module.exports = router;
