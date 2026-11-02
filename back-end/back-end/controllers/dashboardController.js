const { Op, fn, col } = require("sequelize");
const { Book, BookCopy, Author, Category, User, Role, BookIssue, BookRequest, Fine, RoleApplication, RenterListing } = require("../models");

const countRole = (name) => User.count({ include: [{ model: Role, as: "role", where: { name }, required: true }] });

exports.getStats = async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - 6);
    const chartStartDate = chartStart.toISOString().slice(0, 10);

    const [books, copies, availableCopies, issuedCopies, damagedCopies, lostCopies, authors, categories, users, librarians, activeBorrowings, returnedBorrowings, overdueBorrowings, lostBorrowings, pendingRequests, unsettledFines, pendingAccountApplications, pendingRoleApplications, pendingRenterListings, newMembers, issuedByDay, returnedByDay, recentRows, overdueRows] = await Promise.all([
      Book.count(),
      BookCopy.count(),
      BookCopy.count({ where: { status: "available" } }),
      BookCopy.count({ where: { status: "issued" } }),
      BookCopy.count({ where: { status: "damaged" } }),
      BookCopy.count({ where: { status: "lost" } }),
      Author.count(),
      Category.count({ where: { parentId: null } }),
      countRole("user"),
      countRole("librarian"),
      BookIssue.count({ where: { status: { [Op.in]: ["issued", "overdue"] } } }),
      BookIssue.count({ where: { status: "returned" } }),
      BookIssue.count({ where: { status: "overdue" } }),
      BookIssue.count({ where: { status: "lost" } }),
      BookRequest.count({ where: { status: "Pending" } }),
      Fine.count({ where: { status: { [Op.in]: ["Pending", "Partially paid"] } } }),
      User.count({ where: { approvalStatus: "pending" } }),
      RoleApplication.count({ where: { status: "pending" } }),
      RenterListing.count({ where: { status: "pending" } }),
      User.count({ where: { createdAt: { [Op.gte]: monthStart } }, include: [{ model: Role, as: "role", where: { name: "user" }, required: true }] }),
      BookIssue.findAll({ attributes: [[fn("DATE", col("issueDate")), "date"], [fn("COUNT", col("id")), "count"]], where: { issueDate: { [Op.gte]: chartStartDate } }, group: [fn("DATE", col("issueDate"))], raw: true }),
      BookIssue.findAll({ attributes: [[fn("DATE", col("returnDate")), "date"], [fn("COUNT", col("id")), "count"]], where: { returnDate: { [Op.gte]: chartStartDate, [Op.not]: null } }, group: [fn("DATE", col("returnDate"))], raw: true }),
      BookIssue.findAll({ attributes: ["id", "issueDate", "dueDate", "status", "createdAt"], include: [{ model: Book, as: "book", attributes: ["title"] }, { model: User, as: "member", attributes: ["name"] }], order: [["createdAt", "DESC"]], limit: 6 }),
      BookIssue.findAll({ where: { status: "overdue" }, attributes: ["id", "dueDate", "status"], include: [{ model: Book, as: "book", attributes: ["title"] }, { model: User, as: "member", attributes: ["name"] }], order: [["dueDate", "ASC"]], limit: 6 }),
    ]);

    const dayKeys = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });
    const asCountMap = (rows) => Object.fromEntries(rows.map((row) => [String(row.date).slice(0, 10), Number(row.count)]));
    const issuedMap = asCountMap(issuedByDay);
    const returnedMap = asCountMap(returnedByDay);
    const weeklyActivity = dayKeys.map((date) => ({ date, issued: issuedMap[date] || 0, returned: returnedMap[date] || 0 }));

    return res.json({
      stats: { books, copies, availableCopies, issuedCopies, damagedCopies, lostCopies, authors, categories, users, librarians, activeBorrowings, returnedBorrowings, overdueBorrowings, lostBorrowings, pendingRequests, unsettledFines, pendingApplications: pendingAccountApplications + pendingRoleApplications, pendingRenterListings, newMembers },
      weeklyActivity,
      recentBorrowings: recentRows.map((row) => row.toJSON()),
      overdueHistory: overdueRows.map((row) => row.toJSON()),
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    return res.status(500).json({ message: "Unable to load dashboard data. Please try again." });
  }
};
