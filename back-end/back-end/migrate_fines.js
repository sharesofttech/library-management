// Forward-only, repeatable migration. MySQL DDL commits implicitly; never claim
// that a failed schema migration can be rolled back as one transaction.
const { promisify } = require("node:util");
const { DataTypes, QueryTypes } = require("sequelize");
const { sequelize, Fine, FinePayment, LibrarySettings } = require("./models");

async function migrate() {
  const connection = await sequelize.connectionManager.getConnection();
  const query = promisify(connection.query).bind(connection);
  let locked = false;
  try {
    const rows = await query("SELECT GET_LOCK('library_fines_phase1', 30) AS acquired");
    if (Number(rows[0].acquired) !== 1) throw new Error("Another fines migration is running");
    locked = true;
    const qi = sequelize.getQueryInterface();
    // Fail before any DDL if this is not the inspected application schema.
    const issues = await qi.describeTable("book_issues");
    const books = await qi.describeTable("books");
    await qi.describeTable("book_copies");
    await qi.describeTable("users");
    const statusPredicate = issues.status ? "status IN ('issued', 'overdue')" :
      (issues.returnDate ? "returnDate IS NULL" : "1 = 1");
    const duplicates = await sequelize.query(
      `SELECT bookCopyId FROM book_issues WHERE ${statusPredicate} GROUP BY bookCopyId HAVING COUNT(*) > 1`,
      { type: QueryTypes.SELECT }
    );
    if (duplicates.length) throw new Error("Duplicate active borrowings exist. Reconcile them before migration; no records were changed.");
    if (issues.status) {
      const invalid = await sequelize.query("SELECT id FROM book_issues WHERE status NOT IN ('issued','returned','overdue','lost') OR status IS NULL LIMIT 1", { type: QueryTypes.SELECT });
      if (invalid.length) throw new Error("Unrecognized borrowing statuses require manual reconciliation");
    }
    if (!books.originalPrice) await qi.addColumn("books", "originalPrice", { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    if (!issues.returnDate) await qi.addColumn("book_issues", "returnDate", { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null });
    if (!issues.lostDate) await qi.addColumn("book_issues", "lostDate", { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null });
    if (!issues.overdueFineRate) await qi.addColumn("book_issues", "overdueFineRate", { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    const status = { type: DataTypes.ENUM("issued", "returned", "overdue", "lost"), allowNull: false, defaultValue: "issued" };
    if (!issues.status) {
      await qi.addColumn("book_issues", "status", status);
      // Respect any historical return dates rather than reopening completed loans.
      await sequelize.query("UPDATE book_issues SET status = 'returned' WHERE returnDate IS NOT NULL");
    } else if (!issues.status.type.includes("'overdue'") || !issues.status.type.includes("'lost'")) {
      await qi.changeColumn("book_issues", "status", status);
    }
    // Only these new tables are synchronized; no alter/force on existing tables.
    await Fine.sync();
    const fineStatus = (await qi.describeTable("fines")).status;
    if (fineStatus.type !== "ENUM('Pending','Partially paid','Paid')") {
      const waived = await sequelize.query("SELECT id FROM fines WHERE status = 'waived' LIMIT 1", { type: QueryTypes.SELECT });
      if (waived.length) throw new Error("Waived fines need explicit reconciliation before switching to the three payment statuses; no fine status or receipt was changed.");
      // Expand first, map existing rows, then narrow. A temporary paid value
      // avoids case-insensitive MySQL ENUM collisions between paid and Paid.
      await qi.changeColumn("fines", "status", { type: DataTypes.ENUM("unpaid", "partial", "paid", "waived", "Pending", "Partially paid", "__paid_migration"), allowNull: false, defaultValue: "Pending" });
      await sequelize.query("UPDATE fines SET status = CASE status WHEN 'unpaid' THEN 'Pending' WHEN 'partial' THEN 'Partially paid' WHEN 'paid' THEN '__paid_migration' ELSE status END");
      await qi.changeColumn("fines", "status", { type: DataTypes.ENUM("Pending", "Partially paid", "Paid", "__paid_migration"), allowNull: false, defaultValue: "Pending" });
      await sequelize.query("UPDATE fines SET status = 'Paid' WHERE status = '__paid_migration'");
      await qi.changeColumn("fines", "status", { type: DataTypes.ENUM("Pending", "Partially paid", "Paid"), allowNull: false, defaultValue: "Pending" });
    }
    await FinePayment.sync();
    await LibrarySettings.sync();
    const constraints = await sequelize.query(
      "SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()",
      { type: QueryTypes.SELECT }
    );
    const checks = [
      ["books", "books_original_price_nonnegative", "originalPrice IS NULL OR originalPrice >= 0"],
      ["book_issues", "issues_rate_nonnegative", "overdueFineRate IS NULL OR overdueFineRate >= 0"],
      ["fines", "fines_amount_nonnegative", "amount >= 0"],
      ["fines", "fines_status_allowed", "status IN ('Pending', 'Partially paid', 'Paid')"],
      ["fine_payments", "fine_payments_amount_positive", "amount > 0"],
      ["library_settings", "library_settings_singleton", "id = 1"],
      ["library_settings", "library_settings_rate_nonnegative", "overdueFinePerDay >= 0"],
    ];
    for (const [table, name, expression] of checks) {
      if (!constraints.some(c => c.tableName === table && c.constraintName === name)) {
        await sequelize.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` CHECK (${expression})`);
      }
    }
    const indexes = await qi.showIndex("book_issues");
    if (!indexes.some(i => i.name === "book_issues_status_due_date")) {
      await qi.addIndex("book_issues", ["status", "dueDate"], { name: "book_issues_status_due_date" });
    }
    console.log("Phase 1 migration complete. Historical rates/prices remain unknown (NULL); fine settings await an authenticated admin configuration.");
  } finally {
    try { if (locked) await query("SELECT RELEASE_LOCK('library_fines_phase1')"); }
    finally { await sequelize.connectionManager.releaseConnection(connection); }
  }
}

module.exports = migrate;
if (require.main === module) {
  migrate().catch(error => {
    console.error("Fines migration failed:", error.message);
    process.exitCode = 1;
  }).finally(() => sequelize.close());
}
