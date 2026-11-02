const { Category } = require("../models");
const { getListQuery, withPagination } = require("../utils/listQuery");

// Only editable fields are accepted; IDs and timestamps are database managed.
function validateBody(body) {
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return "Category title is required";
  }
  if (body.title.trim().length > 150) return "Category title must be 150 characters or fewer";
  if (body.description != null && typeof body.description !== "string") {
    return "Description must be text";
  }
  if (body.description && Buffer.byteLength(body.description, "utf8") > 65535) {
    return "Description is too long";
  }
  return null;
}

exports.getCategories = async (req, res) => {
  try {
    const { page, limit, search, offset, Op } = getListQuery(req.query);
    const where = { parentId: null };
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
    if (req.query.page || req.query.limit || search) {
      const result = await Category.findAndCountAll({ where, attributes: ["id", "title", "description", "createdAt", "updatedAt"], order: [["id", "ASC"]], limit, offset });
      return res.json(withPagination({ categories: result.rows, count: result.count }, page, limit));
    }
    const categories = await Category.findAll({ where: { parentId: null }, attributes: ["id", "title", "description", "createdAt", "updatedAt"], order: [["id", "ASC"]] });
    return res.json({ categories });
  } catch (err) {
    console.error("Get Categories Error:", err);
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
};

exports.getRenterCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { parentId: null, status: true },
      attributes: ["id", "title"],
      order: [["title", "ASC"]],
    });
    return res.json({ categories });
  } catch (err) {
    console.error("Get Renter Categories Error:", err);
    return res.status(500).json({ message: "Failed to fetch available categories" });
  }
};

exports.validateId = (req, res, next) => {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ message: "Invalid category ID" });
  }
  return next();
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, { attributes: ["id", "title", "description", "createdAt", "updatedAt"] });
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.json({ category });
  } catch (err) {
    console.error("Get Category Error:", err);
    return res.status(500).json({ message: "Failed to fetch category" });
  }
};

exports.createCategory = async (req, res) => {
  const error = validateBody(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const category = await Category.create({
      title: req.body.title.trim(), description: req.body.description?.trim() || null,
    });
    return res.status(201).json({ message: "Category created successfully", category });
  } catch (err) {
    console.error("Create Category Error:", err);
    return res.status(500).json({ message: "Failed to create category" });
  }
};

exports.updateCategory = async (req, res) => {
  const error = validateBody(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const category = await Category.findByPk(req.params.id, { attributes: ["id", "title", "description", "createdAt", "updatedAt"] });
    if (!category) return res.status(404).json({ message: "Category not found" });
    await category.update({
      title: req.body.title.trim(), description: req.body.description?.trim() || null,
    });
    return res.json({ message: "Category updated successfully", category });
  } catch (err) {
    console.error("Update Category Error:", err);
    return res.status(500).json({ message: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, { attributes: ["id", "title", "description", "createdAt", "updatedAt"] });
    if (!category) return res.status(404).json({ message: "Category not found" });
    await category.destroy();
    return res.json({ message: "Category deleted successfully" });
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") return res.status(409).json({ message: "This category is used by books. Reassign those books before deleting it." });
    console.error("Delete Category Error:", err);
    return res.status(500).json({ message: "Failed to delete category" });
  }
};
