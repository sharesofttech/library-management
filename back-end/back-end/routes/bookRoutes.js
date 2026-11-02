const router = require("express").Router();
const controller = require("../controllers/bookController");
const upload = require("../utils/bookUpload");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

router.use("/books", verifyToken, requireRole("admin", "librarian"));
router.get("/books/options", controller.getOptions);
router.get("/books", controller.getBooks);
router.post("/books", upload, controller.createBook);
router.get("/books/:id", controller.validateId, controller.getBook);
router.put("/books/:id", controller.validateId, upload, controller.updateBook);
router.patch("/books/:id/copies/:copyId", controller.validateId, controller.updateCopy);
router.delete("/books/:id", controller.validateId, controller.deleteBook);
module.exports = router;
