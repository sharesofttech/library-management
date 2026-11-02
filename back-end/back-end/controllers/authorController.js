const { Author } = require("../models");
const { getListQuery, withPagination } = require("../utils/listQuery");

// Only editable fields are accepted; IDs and timestamps are database managed.
function validateBody(body) {
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return "Author name is required";
  }
  if (body.name.trim().length > 150) return "Author name must be 150 characters or fewer";
  if (body.description != null && typeof body.description !== "string") {
    return "Description must be text";
  }
  if (body.description && Buffer.byteLength(body.description, "utf8") > 65535) {
    return "Description is too long";
  }
  return null;
}

exports.getAuthors = async (req, res) => {
  try {
    const { page, limit, search, offset, Op } = getListQuery(req.query);
    const where = search ? { [Op.or]: [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ] } : {};
    if (req.query.page || req.query.limit || search) {
      const result = await Author.findAndCountAll({ where, order: [["id", "DESC"]], limit, offset });
      return res.json(withPagination({ authors: result.rows, count: result.count }, page, limit));
    }
    const authors = await Author.findAll({ order: [["id", "DESC"]] });
    return res.json({ authors });
  } catch (err) {
    console.error("Get Authors Error:", err);
    return res.status(500).json({ message: "Failed to fetch authors" });
  }
};

exports.validateId = (req, res, next) => {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ message: "Invalid author ID" });
  }
  return next();
};

exports.getAuthorById = async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) return res.status(404).json({ message: "Author not found" });
    return res.json({ author });
  } catch (err) {
    console.error("Get Author Error:", err);
    return res.status(500).json({ message: "Failed to fetch author" });
  }
};

exports.createAuthor = async (req, res) => {
  const error = validateBody(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const author = await Author.create({
      name: req.body.name.trim(), description: req.body.description?.trim() || null,
    });
    return res.status(201).json({ message: "Author created successfully", author });
  } catch (err) {
    console.error("Create Author Error:", err);
    return res.status(500).json({ message: "Failed to create author" });
  }
};

exports.updateAuthor = async (req, res) => {
  const error = validateBody(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) return res.status(404).json({ message: "Author not found" });
    await author.update({
      name: req.body.name.trim(), description: req.body.description?.trim() || null,
    });
    return res.json({ message: "Author updated successfully", author });
  } catch (err) {
    console.error("Update Author Error:", err);
    return res.status(500).json({ message: "Failed to update author" });
  }
};

exports.deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) return res.status(404).json({ message: "Author not found" });
    await author.destroy();
    return res.json({ message: "Author deleted successfully" });
  } catch (err) {
    console.error("Delete Author Error:", err);
    return res.status(500).json({ message: "Failed to delete author" });
  }
};
