const { test } = require("node:test");
const assert = require("node:assert/strict");

const Category = {};
// Isolate controller behavior from the configured MySQL database.
require.cache[require.resolve("../models")] = { exports: { Category } };
const controller = require("../controllers/categoryController");
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("create rejects malformed names and descriptions", async () => {
  for (const body of [undefined, {}, { title: " " }, { title: 42 }, { title: "x".repeat(151) }, { title: "Category", description: {} }, { title: "Category", description: "x".repeat(65536) }]) {
    const res = response();
    await controller.createCategory({ body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("create trims input and ignores client IDs and timestamps", async () => {
  let saved;
  Category.create = async (fields) => { saved = fields; return { id: 1, ...fields }; };
  const res = response();
  await controller.createCategory({ body: { id: 99, title: " Category ", description: " Bio ", createdAt: "fake" } }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(saved, { title: "Category", description: "Bio" });
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

test("get, update and delete return 404 for missing categories", async () => {
  Category.findByPk = async () => null;
  for (const action of ["getCategoryById", "updateCategory", "deleteCategory"]) {
    const res = response();
    await controller[action]({ params: { id: "1" }, body: { title: "Category" } }, res);
    assert.equal(res.statusCode, 404);
  }
});

test("update saves editable fields and delete destroys the category", async () => {
  let updated;
  let destroyed = false;
  Category.findByPk = async () => ({ update: async (fields) => { updated = fields; }, destroy: async () => { destroyed = true; } });
  const res = response();
  await controller.updateCategory({ params: { id: "1" }, body: { title: " Updated ", description: "", id: 10 } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(updated, { title: "Updated", description: null });
  await controller.deleteCategory({ params: { id: "1" } }, response());
  assert.equal(destroyed, true);
});
