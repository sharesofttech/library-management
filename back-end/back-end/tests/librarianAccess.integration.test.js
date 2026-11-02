const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { sequelize, User, Role } = require("../models");

test("librarians access library modules and users, while staff management stays admin only", async () => {
  const fixtures = [];
  let server;
  try {
    const tokens = {};
    for (const name of ["admin", "librarian", "user"]) {
      const role = await Role.findOne({ where: { name } });
      const user = await User.create({ name: "Access fixture", email: `${randomUUID()}@example.test`, countryCode: "+91", phone: "9999999999", password: "test-only-not-used-for-login", roleId: role.id });
      fixtures.push(user);
      tokens[name] = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "default_jwt_secret");
    }
    const app = express();
    app.use(express.json());
    for (const name of ["book", "author", "category", "dashboard", "user", "catalog"]) app.use("/api", require(`../routes/${name}Routes`));
    server = await new Promise((resolve) => { const running = app.listen(0, "127.0.0.1", () => resolve(running)); });
    const request = (role, url, method = "GET", body) => fetch(`http://127.0.0.1:${server.address().port}/api${url}`, { method, headers: { Authorization: `Bearer ${tokens[role]}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    for (const url of ["/books/options", "/authors", "/categories", "/dashboard/stats", "/users/role/user"]) {
      assert.equal((await request("librarian", url)).status, 200, url);
      assert.equal((await request("user", url)).status, 403, url);
    }
    const catalog = await request("user", "/catalog/books");
    assert.equal(catalog.status, 200);
    const { books } = await catalog.json();
    assert.ok(Array.isArray(books));
    for (const book of books) {
      assert.ok(Object.hasOwn(book, "title"));
      assert.ok(Object.hasOwn(book, "author"));
      assert.equal(Object.hasOwn(book, "copies"), false);
    }
    assert.equal((await request("user", "/books", "POST", { title: "Not allowed" })).status, 403);
    assert.equal((await request("user", "/catalog/books", "POST", {})).status, 404);
    assert.equal((await request("librarian", "/users/role/librarian")).status, 403);
    assert.equal((await request("admin", "/users/role/librarian")).status, 200);
    for (const method of ["GET", "PUT", "DELETE"]) {
      assert.equal((await request("librarian", `/users/${fixtures[0].id}`, method, method === "PUT" ? {} : undefined)).status, 403);
      assert.equal((await request("librarian", `/users/${fixtures[1].id}`, method, method === "PUT" ? {} : undefined)).status, 403);
    }
    for (const roleName of ["admin", "librarian"]) assert.equal((await request("librarian", "/users", "POST", { roleName })).status, 403);
    assert.equal((await request("librarian", `/users/${fixtures[2].id}`)).status, 200);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const user of fixtures) await user.destroy();
    await sequelize.close();
  }
});
