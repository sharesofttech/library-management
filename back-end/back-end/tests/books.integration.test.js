// Run after the backend has synchronized the new tables:
// node --test tests/books.integration.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { sequelize, Category, Author, Book, BookCopy } = require("../models");
const controller = require("../controllers/bookController");
const response = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } });
const call = async (action, req) => { const res = response(); await controller[action](req, res); return res; };

test("books inventory persists atomically and protects issued copies", async () => {
  let category, author, bookId;
  try {
    category = await Category.create({ title: "Books integration fixture" });
    author = await Author.create({ name: "Books integration fixture" });
    const body = { title: "Integration book", isbn: `TEST${randomUUID().replaceAll("-", "").slice(0, 20)}`, categoryId: category.id, authorId: author.id, noofcopies: 3, publisher: "Test publisher", publishedYear: 2020 };
    const imageBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=", "base64");
    const created = await call("createBook", { body, file: { buffer: imageBuffer, extension: "png" } });
    assert.equal(created.statusCode, 201, JSON.stringify(created.body));
    bookId = created.body.book.id;
    const imagePath = path.join(__dirname, "..", created.body.book.bookImg);
    assert.deepEqual(await fs.readFile(imagePath), imageBuffer);
    const params = { id: String(bookId) };
    let copies = await BookCopy.findAll({ where: { bookId }, order: [["id", "ASC"]] });
    assert.equal(copies.length, 3);
    assert.equal(new Set(copies.map((copy) => copy.copyCode)).size, 3);
    assert.ok(copies.every((copy) => copy.status === "available"));

    const duplicate = await call("createBook", { body });
    assert.equal(duplicate.statusCode, 409);
    const invalidReference = await call("updateBook", { params, body: { ...body, authorId: 2147483647 } });
    assert.equal(invalidReference.statusCode, 400);

    const issued = await call("updateCopy", { params: { ...params, copyId: String(copies[0].id) }, body: { status: "issued" } });
    assert.equal(issued.statusCode, 200);
    const blocked = await call("updateBook", { params, body: { ...body, noofcopies: 0, title: "Should roll back" } });
    assert.equal(blocked.statusCode, 409);
    assert.equal((await Book.findByPk(bookId)).title, body.title);
    assert.equal(await BookCopy.count({ where: { bookId } }), 3);
    assert.equal((await call("deleteBook", { params })).statusCode, 409);

    const reduced = await call("updateBook", { params, body: { ...body, noofcopies: 1 } });
    assert.equal(reduced.statusCode, 200);
    assert.equal(await BookCopy.count({ where: { bookId } }), 1);
    assert.equal((await BookCopy.findByPk(copies[0].id)).status, "issued");
    const increased = await call("updateBook", { params, body: { ...body, noofcopies: 4 } });
    assert.equal(increased.statusCode, 200);
    assert.equal(await BookCopy.count({ where: { bookId } }), 4);
    assert.equal((await Book.findByPk(bookId)).noofcopies, 4);
    const invalidStatus = await call("updateCopy", { params: { ...params, copyId: String(copies[0].id) }, body: { status: "unknown" } });
    assert.equal(invalidStatus.statusCode, 400);
    await call("updateCopy", { params: { ...params, copyId: String(copies[0].id) }, body: { status: "available" } });
    assert.equal((await call("getBook", { params })).body.book.copies.length, 4);
    assert.equal((await call("deleteBook", { params })).statusCode, 200);
    await assert.rejects(fs.access(imagePath), { code: "ENOENT" });
    assert.equal(await BookCopy.count({ where: { bookId } }), 0);
    assert.equal((await call("getBook", { params })).statusCode, 404);
  } finally {
    if (bookId) await Book.destroy({ where: { id: bookId } });
    if (author) await author.destroy();
    if (category) await category.destroy();
    await sequelize.close();
  }
});
