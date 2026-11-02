const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { sequelize, Book, BookCopy, Category, Author, BookIssue } = require("../models");
const { bookPayload } = require("../utils/bookValidation");
const { getListQuery, withPagination } = require("../utils/listQuery");

const include = [{ model: Category, as: "category", attributes: ["id", "title"] }, { model: Author, as: "author", attributes: ["id", "name"] }];
const imageDir = path.join(__dirname, "../uploads/books");
const fail = (message, status = 400) => { const err = new Error(message); err.status = status; throw err; };
const cleanup = async (url) => {
  if (!url || !/^\/uploads\/books\/[\w.-]+$/.test(url)) return;
  await fs.unlink(path.join(imageDir, path.basename(url))).catch((err) => { if (err.code !== "ENOENT") console.error("Book image cleanup:", err); });
};
const errorResponse = (res, err) => {
  if (err.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "A book with this ISBN already exists" });
  if (err.name === "SequelizeForeignKeyConstraintError") return res.status(409).json({ message: "The selected category or author is no longer available" });
  if (!err.status) console.error("Books Error:", err);
  return res.status(err.status || 500).json({ message: err.status ? err.message : "Unable to complete the book operation. Please try again." });
};

exports.validateId = (req, res, next) => {
  for (const value of Object.values(req.params)) {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return res.status(400).json({ message: "Invalid book or copy ID" });
  }
  return next();
};

exports.getOptions = async (req, res) => {
  try {
    const [categories, authors] = await Promise.all([
      Category.findAll({ attributes: ["id", "title"], order: [["title", "ASC"]] }),
      Author.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] }),
    ]);
    return res.json({ categories, authors });
  } catch (err) { return errorResponse(res, err); }
};

exports.getBooks = async (req, res) => {
  try {
    const { page, limit, search, offset, Op } = getListQuery(req.query);
    const where = {};
    if (req.query.categoryId && /^[1-9]\d*$/.test(req.query.categoryId)) where.categoryId = Number(req.query.categoryId);
    if (req.query.authorId && /^[1-9]\d*$/.test(req.query.authorId)) where.authorId = Number(req.query.authorId);
    if (req.query.copies === "available") where.noofcopies = { [Op.gt]: 0 };
    if (req.query.copies === "empty") where.noofcopies = 0;
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { id: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
      { isbn: { [Op.like]: `%${search}%` } },
      { publisher: { [Op.like]: `%${search}%` } },
      { createdAt: { [Op.like]: `%${search}%` } },
      { updatedAt: { [Op.like]: `%${search}%` } },
      { "$category.title$": { [Op.like]: `%${search}%` } },
      { "$author.name$": { [Op.like]: `%${search}%` } },
    ];
    const orderKey = ["title", "publishedYear", "createdAt"].includes(req.query.sort) ? req.query.sort : "id";
    const direction = req.query.direction === "ASC" ? "ASC" : "DESC";
    const order = req.query.sort === "author"
      ? [[{ model: Author, as: "author" }, "name", direction]]
      : [[orderKey, direction]];
    if (req.query.page || req.query.limit || search || req.query.categoryId || req.query.authorId || req.query.copies) {
      const result = await Book.findAndCountAll({
        where, include, distinct: true,
        order,
        limit, offset,
      });
      return res.json(withPagination({ books: result.rows, count: result.count }, page, limit));
    }
    return res.json({ books: await Book.findAll({ include, order: [["id", "DESC"]] }) });
  }
  catch (err) { return errorResponse(res, err); }
};

exports.getBook = async (req, res) => {
  try {
    if (req.query.page || req.query.limit || req.query.search || req.query.status) {
      const { page, limit, search, offset, Op } = getListQuery(req.query);
      const book = await Book.findByPk(req.params.id, { include });
      if (!book) fail("Book not found", 404);
      const where = { bookId: book.id };
      if (req.query.status && ["available", "issued", "damaged", "lost"].includes(req.query.status)) where.status = req.query.status;
      if (search) where[Op.or] = [
        { id: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
        { copyCode: { [Op.like]: `%${search}%` } },
        { status: { [Op.like]: `%${search}%` } },
        { createdAt: { [Op.like]: `%${search}%` } },
        { updatedAt: { [Op.like]: `%${search}%` } },
      ];
      const result = await BookCopy.findAndCountAll({ where, order: [["id", "ASC"]], limit, offset });
      book.setDataValue("copies", result.rows);
      return res.json({ book, copiesPagination: { page, limit, total: result.count, totalPages: Math.max(1, Math.ceil(result.count / limit)) } });
    }
    const book = await Book.findByPk(req.params.id, { include: [...include, { model: BookCopy, as: "copies" }], order: [[{ model: BookCopy, as: "copies" }, "id", "ASC"]] });
    if (!book) fail("Book not found", 404);
    return res.json({ book });
  } catch (err) { return errorResponse(res, err); }
};

// Lock the book before changing inventory so count/status changes cannot race.
const saveBook = (editing) => async (req, res) => {
  let newImage;
  let oldImage;
  try {
    const payload = bookPayload(req.body);
    const book = await sequelize.transaction(async (transaction) => {
      let book = editing ? await Book.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (editing && !book) fail("Book not found", 404);
      if (!await Category.findByPk(payload.categoryId, { transaction })) fail("Select a valid category");
      if (!await Author.findByPk(payload.authorId, { transaction })) fail("Select a valid author");
      if (req.file) {
        await fs.mkdir(imageDir, { recursive: true });
        newImage = `/uploads/books/${randomUUID()}.${req.file.extension}`;
        await fs.writeFile(path.join(imageDir, path.basename(newImage)), req.file.buffer);
        payload.bookImg = newImage;
      } else if (req.body.removeImage === "true") payload.bookImg = null;
      oldImage = book?.bookImg;
      if (!book) book = await Book.create(payload, { transaction });
      const copies = editing ? await BookCopy.findAll({ where: { bookId: book.id }, order: [["id", "DESC"]], transaction, lock: transaction.LOCK.UPDATE }) : [];
      const difference = payload.noofcopies - copies.length;
      if (difference < 0) {
        const removable = copies.filter((copy) => copy.status === "available").slice(0, -difference);
        if (removable.length < -difference) fail("Only available copies can be removed. Return or resolve other copies before reducing the count.", 409);
        await BookCopy.destroy({ where: { id: removable.map((copy) => copy.id) }, transaction });
      } else if (difference > 0) {
        await BookCopy.bulkCreate(Array.from({ length: difference }, () => ({ bookId: book.id, copyCode: `BK-${book.id}-${randomUUID()}`, status: "available" })), { transaction });
      }
      if (editing) await book.update(payload, { transaction });
      return book;
    });
    if (oldImage && oldImage !== book.bookImg) await cleanup(oldImage);
    return res.status(editing ? 200 : 201).json({ message: editing ? "Book updated successfully" : "Book created successfully", book });
  } catch (err) {
    await cleanup(newImage);
    return errorResponse(res, err);
  }
};
exports.createBook = saveBook(false);
exports.updateBook = saveBook(true);

exports.updateCopy = async (req, res) => {
  try {
    const status = req.body?.status;
    if (!["available", "issued", "damaged", "lost"].includes(status)) fail("Select a valid copy status");
    const copy = await sequelize.transaction(async (transaction) => {
      const book = await Book.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!book) fail("Book not found", 404);
      const copy = await BookCopy.findOne({ where: { id: req.params.copyId, bookId: book.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!copy) fail("Book copy not found", 404);
      if (copy.status === "lost" && status !== "lost") fail("A lost copy cannot be made available through inventory editing", 409);
      if (status !== "issued" && await BookIssue.count({ where: { bookCopyId: copy.id, status: ["issued", "overdue"] }, transaction })) fail("Use Borrowings to return or mark lost an active loan", 409);
      await copy.update({ status }, { transaction });
      return copy;
    });
    return res.json({ message: "Copy status updated successfully", copy });
  } catch (err) { return errorResponse(res, err); }
};

exports.deleteBook = async (req, res) => {
  try {
    const image = await sequelize.transaction(async (transaction) => {
      const book = await Book.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!book) fail("Book not found", 404);
      if (await BookCopy.count({ where: { bookId: book.id, status: "issued" }, transaction })) fail("Return all issued copies before deleting this book", 409);
      await book.destroy({ transaction });
      return book.bookImg;
    });
    await cleanup(image);
    return res.json({ message: "Book and its copies deleted successfully" });
  } catch (err) { return errorResponse(res, err); }
};
