const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sequelize, BookIssue, BookRequest, Fine, FinePayment, LibrarySettings } = require("../models");
const migrate = require("../migrate_fines");

test("fines migration preserves records on rerun and enforces financial constraints in MySQL", async () => {
  let transaction;
  try {
    const before = await BookIssue.findAll({ raw: true, order: [["id", "ASC"]] });
    const paymentsBefore = await FinePayment.findAll({ raw: true, order: [["id", "ASC"]] });
    await migrate();
    const statusColumn = (await sequelize.getQueryInterface().describeTable("fines")).status;
    assert.equal(statusColumn.type, "ENUM('Pending','Partially paid','Paid')");
    assert.equal(statusColumn.defaultValue, "Pending");
    assert.deepEqual(await BookIssue.findAll({ raw: true, order: [["id", "ASC"]] }), before);
    assert.deepEqual(await FinePayment.findAll({ raw: true, order: [["id", "ASC"]] }), paymentsBefore);
    assert.ok(before.length, "This integration test needs an existing library borrowing");
    transaction = await sequelize.transaction();
    const options = { transaction };
    const source = before[0];
    const request = await BookRequest.create({ memberId: source.memberId, bookId: source.bookId, status: "Fulfilled" }, options);
    const borrowing = await BookIssue.create({
      requestId: request.id, memberId: source.memberId, bookId: source.bookId,
      bookCopyId: source.bookCopyId, issuedBy: source.issuedBy,
      issueDate: "2026-10-01", dueDate: "2026-10-15", returnDate: "2026-10-16",
      status: "returned", overdueFineRate: "0.10",
    }, options);
    const fine = await Fine.create({ borrowingId: borrowing.id, type: "overdue", amount: "0.30" }, options);
    assert.equal(fine.status, "Pending");
    await assert.rejects(sequelize.query("UPDATE fines SET status = 'unpaid' WHERE id = :id", { ...options, replacements: { id: fine.id } }));
    await assert.rejects(Fine.create({ borrowingId: borrowing.id, type: "overdue", amount: "1.00" }, options), { name: "SequelizeUniqueConstraintError" });
    await Fine.create({ borrowingId: borrowing.id, type: "lost", amount: "500.00" }, options);
    for (const amount of ["0.10", "0.20"]) {
      await FinePayment.create({ fineId: fine.id, amount, paymentMethod: "cash", receivedBy: source.issuedBy }, options);
    }
    const loaded = await Fine.findByPk(fine.id, { ...options, include: [{ association: "payments", include: ["receiver"] }, { association: "borrowing", include: ["member", "book", "copy"] }] });
    assert.equal(loaded.payments.length, 2);
    assert.equal(loaded.payments.reduce((sum, p) => sum + BigInt(p.amount.replace(".", "")), 0n), 30n);
    assert.equal(loaded.borrowing.member.id, source.memberId);
    assert.equal(loaded.payments[0].receiver.id, source.issuedBy);
    await assert.rejects(fine.destroy(options), { name: "SequelizeForeignKeyConstraintError" });
    await assert.rejects(borrowing.destroy(options), { name: "SequelizeForeignKeyConstraintError" });
    await assert.rejects(FinePayment.create({ fineId: fine.id, amount: "0.00", paymentMethod: "cash", receivedBy: source.issuedBy }, { ...options, validate: false }));
    await assert.rejects(sequelize.query("UPDATE fines SET amount = -1.00 WHERE id = :id", { ...options, replacements: { id: fine.id } }));
    await assert.rejects(LibrarySettings.create({ id: 2, overdueFinePerDay: "1.00", updatedBy: source.issuedBy }, { ...options, validate: false }));
    await assert.rejects(Fine.build({ borrowingId: borrowing.id, type: "overdue", amount: "1.001" }).validate());
    await assert.rejects(FinePayment.build({ fineId: fine.id, amount: "0", paymentMethod: "cash", receivedBy: source.issuedBy }).validate());
  } finally {
    if (transaction) await transaction.rollback();
    await sequelize.close();
  }
});
