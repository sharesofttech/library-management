const router = require("express").Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { Book, Category, Author } = require("../models");

// The user catalog is read-only and does not expose inventory management routes.
router.get("/catalog/books", verifyToken, requireRole("user"), async (req, res) => {
  try {
    const books = await Book.findAll({
      attributes: ["id", "title", "isbn", "publisher", "publishedYear", "bookImg", "noofcopies"],
      include: [
        { model: Category, as: "category", attributes: ["id", "title"] },
        { model: Author, as: "author", attributes: ["id", "name"] },
      ],
      order: [["id", "DESC"]],
    });
    return res.json({ books });
  } catch (err) {
    console.error("Book catalog error:", err);
    return res.status(500).json({ message: "Unable to load books. Please try again." });
  }
});
module.exports = router;
