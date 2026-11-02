const { test } = require("node:test");
const assert = require("node:assert/strict");

const Author = {};
// Isolate controller behavior from the configured MySQL database.
require.cache[require.resolve("../models")] = { exports: { Author } };
const controller = require("../controllers/authorController");
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("create rejects malformed names and descriptions", async () => {
  for (const body of [undefined, {}, { name: " " }, { name: 42 }, { name: "x".repeat(151) }, { name: "Author", description: {} }, { name: "Author", description: "x".repeat(65536) }]) {
    const res = response();
    await controller.createAuthor({ body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("create trims input and ignores client IDs and timestamps", async () => {
  let saved;
  Author.create = async (fields) => { saved = fields; return { id: 1, ...fields }; };
  const res = response();
  await controller.createAuthor({ body: { id: 99, name: " Author ", description: " Bio ", createdAt: "fake" } }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(saved, { name: "Author", description: "Bio" });
});

test("ID validation rejects invalid database identifiers", () => {
  for (const id of ["0", "-1", "abc", "1.5", "9007199254740992"]) {
    const res = response();
    controller.validateId({ params: { id } }, res, () => assert.fail("Invalid ID accepted"));
    assert.equal(res.statusCode, 400);
  }
  let called = false;
  controller.validateId({ params: { id: "12" } }, response(), () => { called = true; });
  assert.equal(called, true);
});

test("get, update and delete return 404 for missing authors", async () => {
  Author.findByPk = async () => null;
  for (const action of ["getAuthorById", "updateAuthor", "deleteAuthor"]) {
    const res = response();
    await controller[action]({ params: { id: "1" }, body: { name: "Author" } }, res);
    assert.equal(res.statusCode, 404);
  }
});

test("update saves editable fields and delete destroys the author", async () => {
  let updated;
  let destroyed = false;
  Author.findByPk = async () => ({ update: async (fields) => { updated = fields; }, destroy: async () => { destroyed = true; } });
  const res = response();
  await controller.updateAuthor({ params: { id: "1" }, body: { name: " Updated ", description: "", id: 10 } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(updated, { name: "Updated", description: null });
  await controller.deleteAuthor({ params: { id: "1" } }, response());
  assert.equal(destroyed, true);
});
