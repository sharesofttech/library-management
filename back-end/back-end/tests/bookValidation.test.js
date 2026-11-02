const { test } = require("node:test");
const assert = require("node:assert/strict");
const { bookPayload } = require("../utils/bookValidation");
const valid = { title: " Book ", isbn: "978-1-2345", categoryId: "1", authorId: "2", noofcopies: "3", publisher: " Publisher ", publishedYear: "2020" };

test("book payload normalizes editable fields and ignores generated fields", () => {
  assert.deepEqual(bookPayload({ ...valid, id: 99, createdAt: "fake", bookImg: "fake" }), {
    title: "Book", isbn: "97812345", categoryId: 1, authorId: 2, noofcopies: 3, publisher: "Publisher", publishedYear: 2020,
  });
});
test("invalid counts, foreign keys, strings and years are rejected", () => {
  for (const change of [{ title: " " }, { isbn: " -- " }, { authorId: 0 }, { categoryId: "1a" }, { noofcopies: "1.5" }, { noofcopies: -1 }, { noofcopies: "" }, { noofcopies: 1001 }, { publisher: {} }, { publishedYear: 10000 }, { title: "a".repeat(201) }]) {
    assert.throws(() => bookPayload({ ...valid, ...change }), (error) => error.status === 400);
  }
});
test("zero inventory and optional publication fields are supported", () => {
  const payload = bookPayload({ ...valid, noofcopies: "0", publisher: "", publishedYear: "" });
  assert.equal(payload.noofcopies, 0);
  assert.equal(payload.publisher, null);
  assert.equal(payload.publishedYear, null);
});
