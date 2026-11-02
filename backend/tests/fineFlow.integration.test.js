const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { sequelize, Role, User, Category, Author, Book, BookCopy, BookRequest, BookIssue, Fine, FinePayment, LibrarySettings } = require("../models");
const { today } = require("../utils/fineCalculation");
const { synchronize } = require("../utils/fineService");

test("real MySQL and authenticated APIs cover settings, issuance, overdue, return/lost, installments, ownership and concurrency", async () => {
  let server, category, author, book;
  const users = [], issueIds = [], requestIds = [];
  const originalSettings = await LibrarySettings.findByPk(1, { raw: true });
  const suffix = randomUUID();
  const shift = days => { const date = new Date(`${today()}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
  try {
    for (const roleName of ["admin", "librarian", "user", "user"]) {
      const role = await Role.findOne({ where: { name: roleName } });
      users.push(await User.create({ name: `Fine test ${roleName}`, email: `${users.length}-${suffix}@example.test`, countryCode: "+91", phone: "9000000000", password: "test-session-only", roleId: role.id }));
    }
    const [admin, librarian, member, other] = users;
    const app = express(); app.use(express.json());
    app.use("/api", require("../routes/bookIssueRoutes"));
    app.use("/api", require("../routes/bookRoutes"));
    app.use("/api", require("../routes/fineRoutes"));
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const call = async (user, method, path, body) => {
      const token = user ? jwt.sign({ id: user.id }, process.env.JWT_SECRET || "default_jwt_secret") : null;
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, data: await response.json() };
    };
    const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.data)); return response.data; };
    assert.equal((await call(null, "GET", "/settings/fines")).status, 401);
    assert.equal((await call(librarian, "PATCH", "/settings/fines", { overdueFinePerDay: "1.00" })).status, 403);
    assert.equal((await call(member, "GET", "/fines")).status, 403);
    assert.equal((await call(admin, "PATCH", "/settings/fines", { overdueFinePerDay: "-1" })).status, 400);
    ok(await call(admin, "PATCH", "/settings/fines", { overdueFinePerDay: "0.10" }));
    assert.equal(ok(await call(librarian, "GET", "/settings/fines")).settings.overdueFinePerDay, "0.10");
    category = await Category.create({ title: `Fine integration ${suffix}` });
    author = await Author.create({ name: `Fine integration ${suffix}` });
    book = await Book.create({ title: `Fine test book ${suffix}`, isbn: suffix.replaceAll("-", ""), categoryId: category.id, authorId: author.id, noofcopies: 8, originalPrice: "500.25" });
    const copies = [];
    for (let index = 0; index < 8; index++) copies.push(await BookCopy.create({ bookId: book.id, copyCode: `${suffix}-${index}` }));
    const issue = async (index, due = shift(-3), owner = member) => {
      const request = await BookRequest.create({ memberId: owner.id, bookId: book.id, status: "Approved", approvedBy: admin.id }); requestIds.push(request.id);
      const result = ok(await call(librarian, "POST", "/book-issues", { requestId: request.id, bookCopyId: copies[index].id, issueDate: shift(-10), dueDate: due }), 201);
      issueIds.push(result.issue.id);
      assert.equal((await copies[index].reload()).status, "issued");
      assert.equal((await request.reload()).status, "Fulfilled");
      return result.issue;
    };
    const a = await issue(0);
    assert.equal(a.overdueFineRate, "0.10");
    ok(await call(admin, "PATCH", "/settings/fines", { overdueFinePerDay: "0.20" }));
    const b = await issue(1, shift(3));
    assert.equal(b.overdueFineRate, "0.20");
    assert.equal((await BookIssue.findByPk(a.id)).overdueFineRate, "0.10");
    let preview = ok(await call(admin, "GET", `/borrowings/${a.id}/fines`)).borrowing;
    assert.equal(preview.status, "overdue"); assert.equal(preview.overdueFine, "0.30");
    await Promise.all([synchronize(member.id), synchronize(member.id)]);
    assert.equal(await Fine.count({ where: { borrowingId: a.id, type: "overdue" } }), 1);
    const overdueFine = preview.fines[0];
    const concurrentPayments = await Promise.all([call(admin, "POST", `/fines/${overdueFine.id}/payments`, { amount: "0.20", paymentMethod: "cash", receivedBy: other.id }), call(librarian, "POST", `/fines/${overdueFine.id}/payments`, { amount: "0.20", paymentMethod: "upi" })]);
    assert.deepEqual(concurrentPayments.map(result => result.status).sort(), [201, 409]);
    assert.equal((await Fine.findByPk(overdueFine.id)).status, "Partially paid");
    assert.ok([admin.id, librarian.id].includes((await FinePayment.findOne({ where: { fineId: overdueFine.id } })).receivedBy));
    ok(await call(librarian, "POST", `/fines/${overdueFine.id}/payments`, { amount: "0.10", paymentMethod: "card" }), 201);
    assert.equal((await Fine.findByPk(overdueFine.id)).status, "Paid");
    // A new calendar day adds exactly one snapshot daily rate without erasing receipts.
    await BookIssue.update({ dueDate: shift(-4) }, { where: { id: a.id } });
    preview = ok(await call(admin, "GET", `/borrowings/${a.id}/fines`)).borrowing;
    assert.equal(preview.fines[0].amount, "0.40"); assert.equal(preview.fines[0].balance, "0.10"); assert.equal(preview.fines[0].status, "Partially paid");
    const returned = ok(await call(admin, "PATCH", `/borrowings/${a.id}/return`, { condition: "good" })).borrowing;
    assert.equal(returned.status, "returned"); assert.equal(returned.returnDate, today());
    assert.equal((await copies[0].reload()).status, "available");
    assert.equal(await FinePayment.count({ where: { fineId: overdueFine.id } }), 2);
    assert.equal((await call(admin, "PATCH", `/borrowings/${a.id}/return`, { condition: "good" })).status, 409);
    assert.equal((await call(admin, "PATCH", `/borrowings/${a.id}/lost`)).status, 409);
    ok(await call(librarian, "PATCH", `/borrowings/${b.id}/return`, { condition: "damaged" }));
    assert.equal((await copies[1].reload()).status, "damaged");
    assert.equal(await Fine.count({ where: { borrowingId: b.id } }), 0);
    const c = await issue(2);
    const lost = ok(await call(librarian, "PATCH", `/borrowings/${c.id}/lost`)).borrowing;
    assert.equal(lost.status, "lost"); assert.equal(lost.returnDate, null); assert.equal(lost.lostDate, today());
    assert.equal((await copies[2].reload()).status, "lost");
    assert.equal(lost.fines.length, 2); assert.equal(lost.fines.find(f => f.type === "lost").amount, "500.25");
    assert.equal(lost.fines.find(f => f.type === "overdue").amount, "0.60");
    const charge = lost.fines.find(f => f.type === "lost");
    for (const amount of ["200.10", "100.15", "200.00"]) ok(await call(librarian, "POST", `/fines/${charge.id}/payments`, { amount, paymentMethod: "cash" }), 201);
    assert.equal((await Fine.findByPk(charge.id)).status, "Paid");
    assert.equal((await call(admin, "POST", `/fines/${charge.id}/payments`, { amount: "0.01", paymentMethod: "cash" })).status, 409);
    assert.equal((await call(member, "POST", `/fines/${charge.id}/payments`, { amount: "1", paymentMethod: "cash" })).status, 403);
    assert.equal((await call(admin, "PATCH", `/borrowings/${c.id}/return`, { condition: "good" })).status, 409);
    assert.equal((await call(admin, "PATCH", `/books/${book.id}/copies/${copies[2].id}`, { status: "available" })).status, 409);
    assert.equal(ok(await call(other, "GET", "/my/fines?memberId=" + member.id)).fines.length, 0);
    assert.equal(ok(await call(other, "GET", "/my/fine-payments?memberId=" + member.id)).payments.length, 0);
    const mine = ok(await call(member, "GET", "/my/fines")).fines;
    assert.ok(mine.length >= 3); assert.ok(mine.every(fine => fine.borrowing.memberId === member.id));
    const receipts = ok(await call(member, "GET", "/my/fine-payments")).payments;
    assert.equal(receipts.length, 5); assert.ok(receipts.every(payment => payment.fine.borrowing.memberId === member.id));
    assert.equal(ok(await call(admin, "GET", `/fines/${charge.id}/payments`)).payments.length, 3);
    const d = await issue(3);
    const results = await Promise.all([call(admin, "PATCH", `/borrowings/${d.id}/return`, { condition: "good" }), call(librarian, "PATCH", `/borrowings/${d.id}/lost`)]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const e = await issue(4);
    await Book.update({ originalPrice: null }, { where: { id: book.id } });
    assert.equal((await call(admin, "PATCH", `/borrowings/${e.id}/lost`)).status, 409);
    assert.equal((await BookIssue.findByPk(e.id)).status, "issued");
    assert.equal(await Fine.count({ where: { borrowingId: e.id } }), 0); // rollback includes synchronization
    const f = await issue(5, shift(2), other);
    await BookIssue.update({ overdueFineRate: null }, { where: { id: f.id } });
    assert.equal((await call(librarian, "PATCH", `/borrowings/${f.id}/return`, { condition: "good" })).status, 409);
    assert.equal((await call(librarian, "PATCH", `/borrowings/${f.id}/fine-rate`, { overdueFineRate: "0" })).status, 403);
    ok(await call(admin, "PATCH", `/borrowings/${f.id}/fine-rate`, { overdueFineRate: "0" }));
    assert.equal((await call(admin, "PATCH", `/borrowings/${f.id}/fine-rate`, { overdueFineRate: "1" })).status, 409);
    ok(await call(admin, "PATCH", `/borrowings/${f.id}/return`, { condition: "good" }));
    const g = await issue(6, shift(1));
    await BookCopy.update({ status: "available" }, { where: { id: copies[6].id } });
    const anotherRequest = await BookRequest.create({ memberId: other.id, bookId: book.id, status: "Approved" }); requestIds.push(anotherRequest.id);
    assert.equal((await call(admin, "POST", "/book-issues", { requestId: anotherRequest.id, bookCopyId: copies[6].id, issueDate: shift(-2), dueDate: shift(2) })).status, 409);
    await BookCopy.update({ status: "issued" }, { where: { id: copies[6].id } });
    const h = await issue(7);
    const hPreview = ok(await call(admin, "GET", `/borrowings/${h.id}/fines`)).borrowing;
    const simultaneous = await Promise.all([
      call(admin, "PATCH", `/borrowings/${h.id}/return`, { condition: "good" }),
      call(librarian, "POST", `/fines/${hPreview.fines[0].id}/payments`, { amount: "0.20", paymentMethod: "cash" }),
    ]);
    assert.deepEqual(simultaneous.map(result => result.status), [200, 201]);
    assert.equal((await Fine.findByPk(hPreview.fines[0].id)).amount, "0.60");
    assert.equal((await Fine.findByPk(hPreview.fines[0].id)).status, "Partially paid");
    // Finalized charges never grow even if synchronization is rerun.
    const finalAmount = (await Fine.findByPk(overdueFine.id)).amount;
    await synchronize(member.id);
    assert.equal((await Fine.findByPk(overdueFine.id)).amount, finalAmount);
    assert.equal((await BookRequest.findByPk(c.requestId)).status, "Fulfilled");
    assert.ok(g.id);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (issueIds.length) {
      const fines = await Fine.findAll({ where: { borrowingId: issueIds }, attributes: ["id"] });
      if (fines.length) await FinePayment.destroy({ where: { fineId: fines.map(f => f.id) } });
      await Fine.destroy({ where: { borrowingId: issueIds } });
      await BookIssue.destroy({ where: { id: issueIds } });
    }
    if (requestIds.length) await BookRequest.destroy({ where: { id: requestIds } });
    if (book) { await BookCopy.destroy({ where: { bookId: book.id } }); await book.destroy(); }
    if (author) await author.destroy();
    if (category) await category.destroy();
    if (originalSettings) await LibrarySettings.upsert(originalSettings); else await LibrarySettings.destroy({ where: { id: 1 } });
    for (const user of users) await user.destroy();
    await sequelize.close();
  }
});
