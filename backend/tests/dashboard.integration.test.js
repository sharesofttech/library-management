const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, Book, BookCopy, Author, Category, User, Role } = require("../models");
const { getStats } = require("../controllers/dashboardController");

test("dashboard totals match the current library modules", async () => {
  try {
    let result;
    const res = { json(body) { result = body; }, status(code) { assert.fail(`Unexpected status ${code}`); } };
    await getStats({}, res);
    const stats = result.stats;
    for (const value of Object.values(stats)) assert.ok(Number.isInteger(value) && value >= 0);
    assert.equal(stats.books, await Book.count());
    assert.equal(stats.copies, await BookCopy.count());
    assert.equal(stats.availableCopies, await BookCopy.count({ where: { status: "available" } }));
    assert.equal(stats.issuedCopies, await BookCopy.count({ where: { status: "issued" } }));
    assert.equal(stats.authors, await Author.count());
    assert.equal(stats.categories, await Category.count({ where: { parentId: null } }));
    for (const [key, name] of [["users", "user"], ["librarians", "librarian"]]) {
      assert.equal(stats[key], await User.count({ include: [{ model: Role, as: "role", required: true, where: { name } }] }));
    }
  } finally { await sequelize.close(); }
});
