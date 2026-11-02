const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, Category } = require("../models");
const controller = require("../controllers/categoryController");
const call = async (action, req) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await controller[action](req, res);
  return res;
};

test("category title and description persist through the cleaned CRUD flow", async () => {
  let id;
  try {
    const created = await call("createCategory", { body: { title: " Category fixture ", description: " Description ", metaTitle: "ignored", status: false } });
    assert.equal(created.statusCode, 201);
    id = created.body.category.id;
    const params = { id: String(id) };
    const updated = await call("updateCategory", { params, body: { title: "Edited fixture", description: "" } });
    assert.equal(updated.statusCode, 200);
    const fetched = await call("getCategoryById", { params });
    assert.equal(fetched.body.category.title, "Edited fixture");
    assert.equal(fetched.body.category.description, null);
    assert.deepEqual(Object.keys(fetched.body.category.toJSON()).sort(), ["id", "title", "description", "createdAt", "updatedAt"].sort());
    const listed = await call("getCategories", {});
    assert.ok(listed.body.categories.some((category) => category.id === id));
    assert.equal((await call("deleteCategory", { params })).statusCode, 200);
    assert.equal(await Category.findByPk(id), null);
  } finally {
    if (id) await Category.destroy({ where: { id } });
    await sequelize.close();
  }
});
