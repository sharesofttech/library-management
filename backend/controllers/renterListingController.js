const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { Op } = require("sequelize");
const { RenterListing, RenterListingCopy, User, Category, sequelize } = require("../models");
const { getListQuery, withPagination } = require("../utils/listQuery");

const imageDir = path.join(__dirname, "../uploads/renter-books");
const conditions = ["new", "like new", "good", "acceptable", "worn"];
const countHighlightText = (node) => node?.type === "text"
  ? (node.text?.length || 0)
  : (node?.content || []).reduce((total, child) => total + countHighlightText(child), 0);
const validateHighlights = (rawValue) => {
  const raw = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!raw) return { value: null };
  if (raw.length > 900000) return { error: "Highlights content is too large" };
  if (!raw.startsWith("{")) return raw.length <= 35000
    ? { value: raw }
    : { error: "Highlights must be 35,000 characters or fewer (about 10 pages)" };
  try {
    const document = JSON.parse(raw);
    if (document?.type !== "doc") return { error: "Highlights editor content is invalid" };
    if (countHighlightText(document) > 35000) return { error: "Highlights must be 35,000 characters or fewer (about 10 pages)" };
    return { value: JSON.stringify(document) };
  } catch {
    return { error: "Highlights editor content is invalid" };
  }
};

const saveImage = async (file) => {
  if (!file) return null;
  const fileName = `${randomUUID()}.${file.extension}`;
  await fs.mkdir(imageDir, { recursive: true });
  await fs.writeFile(path.join(imageDir, fileName), file.buffer, { flag: "wx" });
  return `/uploads/renter-books/${fileName}`;
};

const removeImage = async (url) => {
  if (!url || !/^\/uploads\/renter-books\/[\w.-]+$/.test(url)) return;
  await fs.unlink(path.join(imageDir, path.basename(url))).catch((error) => {
    if (error.code !== "ENOENT") console.error("Renter listing image cleanup:", error);
  });
};

const validatePayload = (body) => {
  const title = String(body.title || "").trim();
  const authorName = String(body.authorName || "").trim();
  const categoryId = Number(body.categoryId);
  const description = String(body.description || "").trim();
  const highlightResult = validateHighlights(body.highlights);
  const highlights = highlightResult.value;
  const condition = String(body.condition || "").trim().toLowerCase();
  const copyCount = Number(body.copyCount);
  const rentalPrice = Number(body.rentalPrice);
  const rentalPeriodDays = Number(body.rentalPeriodDays);
  const weightKg = Number(body.weightKg);
  const pickupAvailable = body.pickupAvailable === "true" || body.pickupAvailable === true;
  const deliveryAvailable = body.deliveryAvailable === "true" || body.deliveryAvailable === true;
  const isbn = String(body.isbn || "").trim();

  if (!title || title.length > 200) return { error: "Enter a book title up to 200 characters" };
  if (!authorName || authorName.length > 150) return { error: "Enter an author name up to 150 characters" };
  if (!description || description.length > 5000) return { error: "Enter a description up to 5,000 characters" };
  if (highlightResult.error) return { error: highlightResult.error };
  if (!conditions.includes(condition)) return { error: "Choose a valid book condition" };
  if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 1000) return { error: "Copy count must be between 1 and 1,000" };
  if (!Number.isFinite(rentalPrice) || rentalPrice <= 0 || rentalPrice > 99999999.99) return { error: "Enter a rental price greater than zero" };
  if (!Number.isInteger(rentalPeriodDays) || rentalPeriodDays < 1 || rentalPeriodDays > 365) return { error: "Rental period must be between 1 and 365 days" };
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 50) return { error: "Enter a book weight greater than 0 and no more than 50 kg" };
  if (!pickupAvailable && !deliveryAvailable) return { error: "Choose pickup, delivery or both" };
  if (!Number.isSafeInteger(categoryId) || categoryId < 1) return { error: "Choose a category created by Admin" };
  if (!isbn || isbn.length > 32) return { error: "Enter an ISBN up to 32 characters" };

  return { value: { title, authorName, categoryId, description, highlights, condition, copyCount, rentalPrice: rentalPrice.toFixed(2), rentalPeriodDays, weightKg: weightKg.toFixed(3), pickupAvailable, deliveryAvailable, isbn } };
};

exports.getMyListings = async (req, res) => {
  try {
    const { page, limit, search, offset } = getListQuery(req.query);
    const where = { ownerId: req.user.id };
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { authorName: { [Op.like]: `%${search}%` } },
      { categoryName: { [Op.like]: `%${search}%` } },
      { status: { [Op.like]: `%${search}%` } },
    ];
    const result = await RenterListing.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });
    return res.json(withPagination({ listings: result.rows, count: result.count }, page, limit));
  } catch (error) {
    console.error("Get My Renter Listings Error:", error);
    return res.status(500).json({ message: "Unable to load your book listings" });
  }
};

exports.createListing = async (req, res) => {
  let coverImage;
  try {
    const validated = validatePayload(req.body);
    if (validated.error) return res.status(400).json({ message: validated.error });
    if (!req.file) return res.status(400).json({ message: "Upload a book cover image" });
    const category = await Category.findOne({ where: { id: validated.value.categoryId, parentId: null, status: true }, attributes: ["id", "title"] });
    if (!category) return res.status(400).json({ message: "Choose an active category created by Admin" });
    coverImage = await saveImage(req.file);
    const { categoryId, ...listingFields } = validated.value;
    const listing = await sequelize.transaction(async (transaction) => {
      const created = await RenterListing.create({
        ...listingFields,
        categoryName: category.title,
        ownerId: req.user.id,
        coverImage,
        status: "pending",
      }, { transaction });
      const copies = Array.from({ length: validated.value.copyCount }, (_, index) => ({ listingId: created.id, copyNumber: index + 1, status: "available" }));
      await RenterListingCopy.bulkCreate(copies, { transaction });
      return created;
    });
    return res.status(201).json({ message: "Book listing submitted for Admin review", listing });
  } catch (error) {
    if (coverImage) await removeImage(coverImage);
    console.error("Create Renter Listing Error:", error);
    return res.status(500).json({ message: "Unable to submit your book listing" });
  }
};

exports.updateHighlights = async (req, res) => {
  const result = validateHighlights(req.body.highlights);
  if (result.error) return res.status(400).json({ message: result.error });
  try {
    const listing = await RenterListing.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!listing) return res.status(404).json({ message: "Your book listing was not found" });
    if (listing.status === "rejected") return res.status(409).json({ message: "Highlights cannot be changed on a rejected listing" });
    await listing.update({ highlights: result.value });
    return res.json({ message: "Book highlights saved", listing });
  } catch (error) {
    console.error("Update Renter Listing Highlights Error:", error);
    return res.status(500).json({ message: "Unable to save book highlights" });
  }
};

exports.updateWeight = async (req, res) => {
  const weightKg = Number(req.body.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 50) {
    return res.status(400).json({ message: "Enter a book weight greater than 0 and no more than 50 kg" });
  }
  try {
    const listing = await RenterListing.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!listing) return res.status(404).json({ message: "Your book listing was not found" });
    if (listing.status === "rejected") return res.status(409).json({ message: "Weight cannot be changed on a rejected listing" });
    await listing.update({ weightKg: weightKg.toFixed(3) });
    return res.json({ message: "Book weight saved", listing });
  } catch (error) {
    console.error("Update Renter Listing Weight Error:", error);
    return res.status(500).json({ message: "Unable to save book weight" });
  }
};

exports.getPendingListings = async (req, res) => {
  try {
    const { page, limit, search, offset } = getListQuery(req.query);
    const where = { status: "pending" };
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { authorName: { [Op.like]: `%${search}%` } },
      { "$owner.name$": { [Op.like]: `%${search}%` } },
      { "$owner.email$": { [Op.like]: `%${search}%` } },
    ];
    const result = await RenterListing.findAndCountAll({
      where,
      include: [{ model: User, as: "owner", attributes: ["id", "name", "email", "phone", "countryCode"] }],
      order: [["createdAt", "ASC"]],
      limit,
      offset,
      distinct: true,
    });
    const listings = await Promise.all(result.rows.map(async (listing) => ({
      ...listing.toJSON(),
      availableCopies: await RenterListingCopy.count({ where: { listingId: listing.id, status: "available" } }),
    })));
    return res.json(withPagination({ listings, count: result.count }, page, limit));
  } catch (error) {
    console.error("Get Pending Renter Listings Error:", error);
    return res.status(500).json({ message: "Unable to load pending book listings" });
  }
};

exports.getApprovedListings = async (req, res) => {
  try {
    const { page, limit, search, offset } = getListQuery(req.query);
    const where = { status: "approved" };
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { authorName: { [Op.like]: `%${search}%` } },
      { categoryName: { [Op.like]: `%${search}%` } },
      { isbn: { [Op.like]: `%${search}%` } },
    ];
    const result = await RenterListing.findAndCountAll({
      where,
      attributes: ["id", "title", "authorName", "categoryName", "isbn", "description", "condition", "copyCount", "rentalPrice", "rentalPeriodDays", "weightKg", "pickupAvailable", "deliveryAvailable", "coverImage", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });
    return res.json(withPagination({ listings: result.rows, count: result.count }, page, limit));
  } catch (error) {
    console.error("Get Approved Renter Listings Error:", error);
    return res.status(500).json({ message: "Unable to load renter books" });
  }
};

exports.getApprovedListing = async (req, res) => {
  try {
    const listing = await RenterListing.findOne({
      where: { id: req.params.id, status: "approved" },
      attributes: ["id", "title", "authorName", "categoryName", "isbn", "description", "highlights", "condition", "copyCount", "rentalPrice", "rentalPeriodDays", "weightKg", "pickupAvailable", "deliveryAvailable", "coverImage", "createdAt"],
      include: [{ model: User, as: "owner", attributes: ["id", "name"] }],
    });
    if (!listing) return res.status(404).json({ message: "Renter book not found" });
    const listingData = listing.toJSON();
    if (Number(listingData.owner?.id) !== Number(req.user.id)) delete listingData.owner;
    return res.json({ listing: { ...listingData, availableCopies: await RenterListingCopy.count({ where: { listingId: listing.id, status: "available" } }) } });
  } catch (error) {
    console.error("Get Approved Renter Listing Error:", error);
    return res.status(500).json({ message: "Unable to load this renter book" });
  }
};

exports.reviewListing = async (req, res) => {
  const decision = String(req.body.decision || "").toLowerCase();
  const adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote.trim().slice(0, 1000) : "";
  if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ message: "Decision must be approved or rejected" });

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const listing = await RenterListing.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!listing) return { status: 404, body: { message: "Book listing not found" } };
      if (listing.status !== "pending") return { status: 409, body: { message: "This listing has already been reviewed" } };
      listing.status = decision;
      listing.adminNote = adminNote || null;
      listing.reviewedAt = new Date();
      listing.reviewedBy = req.user.id;
      await listing.save({ transaction });
      return { status: 200, body: { message: `Book listing ${decision}`, listing } };
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Review Renter Listing Error:", error);
    return res.status(500).json({ message: "Unable to review this book listing" });
  }
};
