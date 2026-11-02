
const sequelize = require("../config/db");

const User = require("./User");
const Role = require("./Role");
const Category = require("./Category");
const Author = require("./Author");
const Book = require("./Book");
const BookCopy = require("./BookCopy");
const BookRequest = require("./BookRequest");
const BookIssue = require("./BookIssue");
const Fine = require("./Fine");
const FinePayment = require("./FinePayment");
const LibrarySettings = require("./LibrarySettings");
const RenterListing = require("./RenterListing");
const RoleApplication = require("./RoleApplication");
const RegistrationVerification = require("./RegistrationVerification");
const RentalRequest = require("./RentalRequest");
const RenterListingCopy = require("./RenterListingCopy");
const RentalPayment = require("./RentalPayment");
const DeliveryRateSettings = require("./DeliveryRateSettings");

User.hasMany(RenterListing, { foreignKey: "ownerId", as: "renterListings", onDelete: "RESTRICT" });
RenterListing.belongsTo(User, { foreignKey: "ownerId", as: "owner", onDelete: "RESTRICT" });
RenterListing.hasMany(RenterListingCopy, { foreignKey: "listingId", as: "copies", onDelete: "RESTRICT" });
RenterListingCopy.belongsTo(RenterListing, { foreignKey: "listingId", as: "listing", onDelete: "RESTRICT" });
RentalRequest.hasMany(RenterListingCopy, { foreignKey: "reservedRequestId", as: "reservedCopies", onDelete: "SET NULL" });
RenterListingCopy.belongsTo(RentalRequest, { foreignKey: "reservedRequestId", as: "reservedForRequest", onDelete: "SET NULL" });
RenterListing.belongsTo(User, { foreignKey: "reviewedBy", as: "reviewer", onDelete: "RESTRICT" });
RenterListing.hasMany(RentalRequest, { foreignKey: "listingId", as: "rentalRequests", onDelete: "RESTRICT" });
RentalRequest.belongsTo(RenterListing, { foreignKey: "listingId", as: "listing", onDelete: "RESTRICT" });
User.hasMany(RentalRequest, { foreignKey: "readerId", as: "rentalRequests", onDelete: "RESTRICT" });
RentalRequest.belongsTo(User, { foreignKey: "readerId", as: "reader", onDelete: "RESTRICT" });
User.hasMany(RentalRequest, { foreignKey: "ownerId", as: "receivedRentalRequests", onDelete: "RESTRICT" });
RentalRequest.belongsTo(User, { foreignKey: "ownerId", as: "owner", onDelete: "RESTRICT" });
RentalRequest.hasMany(RentalPayment, { foreignKey: "rentalRequestId", as: "payments", onDelete: "RESTRICT" });
RentalPayment.belongsTo(RentalRequest, { foreignKey: "rentalRequestId", as: "rentalRequest", onDelete: "RESTRICT" });
User.hasMany(RoleApplication, { foreignKey: "userId", as: "roleApplications", onDelete: "RESTRICT" });
RoleApplication.belongsTo(User, { foreignKey: "userId", as: "applicant", onDelete: "RESTRICT" });
RoleApplication.belongsTo(User, { foreignKey: "reviewedBy", as: "reviewer", onDelete: "RESTRICT" });
// Category -> Books
Category.hasMany(Book, {
  foreignKey: "categoryId",
  as: "books",
  onDelete: "RESTRICT",
});

Book.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
  onDelete: "RESTRICT",
});

// Author -> Books
Author.hasMany(Book, {
  foreignKey: "authorId",
  as: "books",
  onDelete: "RESTRICT",
});

Book.belongsTo(Author, {
  foreignKey: "authorId",
  as: "author",
  onDelete: "RESTRICT",
});

// Book -> Copies
Book.hasMany(BookCopy, {
  foreignKey: "bookId",
  as: "copies",
  onDelete: "CASCADE",
});

BookCopy.belongsTo(Book, {
  foreignKey: "bookId",
  as: "book",
  onDelete: "CASCADE",
});

// Role -> Users
Role.hasMany(User, {
  foreignKey: "roleId",
  as: "users",
});

User.belongsTo(Role, {
  foreignKey: "roleId",
  as: "role",
});

// Category -> Subcategories
Category.hasMany(Category, {
  foreignKey: "parentId",
  as: "subcategories",
  onDelete: "CASCADE",
});

Category.belongsTo(Category, {
  foreignKey: "parentId",
  as: "parent",
});

// =================================
// BOOK REQUEST ASSOCIATIONS
// =================================

// User (Member) -> Book Requests
User.hasMany(BookRequest, {
  foreignKey: "memberId",
  as: "bookRequests",
  onDelete: "RESTRICT",
});

BookRequest.belongsTo(User, {
  foreignKey: "memberId",
  as: "member",
  onDelete: "RESTRICT",
});

// Book -> Book Requests
Book.hasMany(BookRequest, {
  foreignKey: "bookId",
  as: "bookRequests",
  onDelete: "RESTRICT",
});

BookRequest.belongsTo(Book, {
  foreignKey: "bookId",
  as: "book",
  onDelete: "RESTRICT",
});

// Admin/Librarian -> Approved Requests
User.hasMany(BookRequest, {
  foreignKey: "approvedBy",
  as: "approvedRequests",
  onDelete: "RESTRICT",
});

BookRequest.belongsTo(User, {
  foreignKey: "approvedBy",
  as: "approver",
  onDelete: "RESTRICT",
});


BookRequest.hasOne(BookIssue, {
  foreignKey: "requestId",
  as: "issue",
});

BookIssue.belongsTo(BookRequest, {
  foreignKey: "requestId",
  as: "request",
});

BookIssue.belongsTo(BookCopy, {
  foreignKey: "bookCopyId",
  as: "copy",
});

BookCopy.hasMany(BookIssue, {
  foreignKey: "bookCopyId",
  as: "issues",
});

BookIssue.belongsTo(User, {
  foreignKey: "memberId",
  as: "member",
});

BookIssue.belongsTo(Book, {
  foreignKey: "bookId",
  as: "book",
});

BookIssue.belongsTo(User, {
  foreignKey: "issuedBy",
  as: "issuer",
});



BookIssue.hasMany(Fine, { foreignKey: "borrowingId", as: "fines", onDelete: "RESTRICT" });
Fine.belongsTo(BookIssue, { foreignKey: "borrowingId", as: "borrowing", onDelete: "RESTRICT" });
Fine.hasMany(FinePayment, { foreignKey: "fineId", as: "payments", onDelete: "RESTRICT" });
FinePayment.belongsTo(Fine, { foreignKey: "fineId", as: "fine", onDelete: "RESTRICT" });
User.hasMany(FinePayment, { foreignKey: "receivedBy", as: "receivedPayments", onDelete: "RESTRICT" });
FinePayment.belongsTo(User, { foreignKey: "receivedBy", as: "receiver", onDelete: "RESTRICT" });
User.hasMany(LibrarySettings, { foreignKey: "updatedBy", as: "fineSettingsUpdates", onDelete: "RESTRICT" });
LibrarySettings.belongsTo(User, { foreignKey: "updatedBy", as: "updater", onDelete: "RESTRICT" });

module.exports = {
  sequelize,
  User,
  Role,
  Category,
  Author,
  Book,
  BookCopy,
  BookRequest,
  BookIssue,
  Fine,
  FinePayment,
  LibrarySettings,
  RenterListing,
  RoleApplication,
  RegistrationVerification,
  RentalRequest,
  RenterListingCopy,
  RentalPayment,
  DeliveryRateSettings
};
