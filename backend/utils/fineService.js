const { Op, Transaction } = require("sequelize");
const { sequelize, BookIssue, Fine, FinePayment, Book, User, RentalRequest, RenterListing } = require("../models");
const { fail, paise, money, today, overdueDays } = require("./fineCalculation");
const sendEmail = require("./sendMail");
const active = ["issued", "overdue"];
const cron = require("node-cron");

const lockOptions = transaction => ({ transaction, lock: transaction.LOCK.UPDATE });

async function totals(fine, transaction) {
  const payments = await FinePayment.findAll({ where: { fineId: fine.id }, transaction });
  const paid = payments.reduce((sum, payment) => sum + paise(payment.amount), 0n);
  const amount = paise(fine.amount);
  if (paid > amount) fail("Recorded payments exceed this fine. Staff reconciliation is required", 409);
  return { paid, balance: amount - paid };
}
async function updateStatus(fine, transaction) {
  const { paid, balance } = await totals(fine, transaction);
  const status = balance === 0n ? "Paid" : paid > 0n ? "Partially paid" : "Pending";
  if (fine.status !== status) await fine.update({ status }, { transaction });
  return { totalPaid: money(paid), balance: money(balance) };
}
// Caller must lock the borrowing first. All return/lost/payment/job paths use
// borrowing -> fine lock order, serializing amount changes and receipts.
async function syncBorrowing(borrowing, transaction, endDate = today()) {
  const terminalDate = borrowing.status === "returned" ? borrowing.returnDate : borrowing.status === "lost" ? borrowing.lostDate : endDate;
  const days = overdueDays(borrowing.dueDate, terminalDate || endDate);
  if (active.includes(borrowing.status) && days > 0 && borrowing.status !== "overdue") {
    await borrowing.update({ status: "overdue" }, { transaction });
  }
  if (borrowing.overdueFineRate == null) return; // Never invent historical rates.
  if (!active.includes(borrowing.status)) return; // Finalized charges never grow.
  const amount = money(BigInt(days) * paise(borrowing.overdueFineRate));
  let fine = await Fine.findOne({ where: { borrowingId: borrowing.id, type: "overdue" }, ...lockOptions(transaction) });
  if (!fine && paise(amount) > 0n) fine = await Fine.create({ borrowingId: borrowing.id, type: "overdue", amount }, { transaction });
  if (fine) {
    // Clock corrections must not erase charges that already have receipts.
    const { paid } = await totals(fine, transaction);
    if (paise(amount) < paid) fail("Fine recalculation would invalidate existing receipts", 409);
    if (fine.amount !== amount) await fine.update({ amount }, { transaction });
    await updateStatus(fine, transaction);
  }
}
async function synchronize(memberId) {
  const where = { status: { [Op.in]: active } };
  if (memberId != null) where.memberId = memberId;
  // Row locks and the unique (borrowingId,type) key make concurrent instances safe.
  let cursor = 0;
  for (;;) {
    const rows = await BookIssue.findAll({ where: { ...where, id: { [Op.gt]: cursor } }, attributes: ["id"], order: [["id", "ASC"]], limit: 200 });
    if (!rows.length) break;
    for (const row of rows) {
      await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async transaction => {
        const borrowing = await BookIssue.findByPk(row.id, lockOptions(transaction));
        if (borrowing) await syncBorrowing(borrowing, transaction);
      });
    }
    cursor = rows[rows.length - 1].id;
  }
}

const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const displayDate = value => {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value).split("-").reverse().join("/");
  return new Intl.DateTimeFormat("en-GB", { timeZone: process.env.LIBRARY_TIMEZONE || "Asia/Kolkata", dateStyle: "medium" }).format(new Date(value));
};

async function claimOverdueReminder(Model, id, now = new Date()) {
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async transaction => {
    const row = await Model.findByPk(id, lockOptions(transaction));
    if (!row || row.overdueReminderSentAt) return false;
    const claimAge = row.overdueReminderClaimedAt ? now.getTime() - new Date(row.overdueReminderClaimedAt).getTime() : Infinity;
    if (claimAge < 10 * 60 * 1000) return false;
    await row.update({ overdueReminderClaimedAt: now }, { transaction });
    return true;
  });
}

async function finishOverdueReminder(Model, id, sent) {
  await Model.update(
    { overdueReminderSentAt: sent ? new Date() : null, overdueReminderClaimedAt: null },
    { where: { id, overdueReminderSentAt: null } }
  );
}

async function sendBorrowingOverdueReminder(id) {
  if (!await claimOverdueReminder(BookIssue, id)) return;
  try {
    const borrowing = await BookIssue.findByPk(id, { include: borrowingInclude });
    if (!borrowing || !active.includes(borrowing.status) || borrowing.dueDate >= today()) return finishOverdueReminder(BookIssue, id, false);
    const member = borrowing.member;
    if (!member?.email) return finishOverdueReminder(BookIssue, id, false);
    const bookTitle = borrowing.book?.title || "your library book";
    const due = displayDate(borrowing.dueDate);
    const result = await sendEmail({
      to: member.email,
      subject: `Overdue book reminder: ${bookTitle}`,
      text: `Hi ${member.name || "Reader"}, the due date for "${bookTitle}" was ${due}. Please return the book to the library as soon as possible. Any applicable late fine is calculated under the library's fine policy.`,
      html: `<p>Hi ${escapeHtml(member.name || "Reader")},</p><p>The due date for <strong>${escapeHtml(bookTitle)}</strong> was <strong>${escapeHtml(due)}</strong>.</p><p>Please return the book to the library as soon as possible. Any applicable late fine is calculated under the library's fine policy.</p>`,
    });
    await finishOverdueReminder(BookIssue, id, !result?.skipped);
  } catch (error) {
    await finishOverdueReminder(BookIssue, id, false).catch(() => {});
    console.error(`[EMAIL] Overdue borrowing reminder failed for borrowing ${id}:`, error.message);
  }
}

async function sendRentalOverdueReminder(id) {
  if (!await claimOverdueReminder(RentalRequest, id)) return;
  try {
    const request = await RentalRequest.findByPk(id, {
      include: [
        { model: User, as: "reader", attributes: ["id", "name", "email"] },
        { model: RenterListing, as: "listing", attributes: ["id", "title"] },
      ],
    });
    if (!request || request.status !== "active" || !request.dueAt || new Date(request.dueAt) >= new Date()) return finishOverdueReminder(RentalRequest, id, false);
    const reader = request.reader;
    if (!reader?.email) return finishOverdueReminder(RentalRequest, id, false);
    const bookTitle = request.listing?.title || "your rented book";
    const due = displayDate(request.dueAt);
    const result = await sendEmail({
      to: reader.email,
      subject: `Overdue rental reminder: ${bookTitle}`,
      text: `Hi ${reader.name || "Reader"}, your rental period for "${bookTitle}" ended on ${due}. Please contact the Renter and arrange the book's return as soon as possible. The agreed daily late charge, if any, is reviewed when Admin records the return.`,
      html: `<p>Hi ${escapeHtml(reader.name || "Reader")},</p><p>Your rental period for <strong>${escapeHtml(bookTitle)}</strong> ended on <strong>${escapeHtml(due)}</strong>.</p><p>Please contact the Renter and arrange the book's return as soon as possible. The agreed daily late charge, if any, is reviewed when Admin records the return.</p>`,
    });
    await finishOverdueReminder(RentalRequest, id, !result?.skipped);
  } catch (error) {
    await finishOverdueReminder(RentalRequest, id, false).catch(() => {});
    console.error(`[EMAIL] Overdue rental reminder failed for rental ${id}:`, error.message);
  }
}

async function sendOverdueReminders() {
  const libraryDate = today();
  const now = new Date();
  const borrowings = await BookIssue.findAll({ where: { status: { [Op.in]: active }, dueDate: { [Op.lt]: libraryDate }, overdueReminderSentAt: null }, attributes: ["id"], order: [["dueDate", "ASC"]], limit: 500 });
  for (const borrowing of borrowings) await sendBorrowingOverdueReminder(borrowing.id);

  const rentals = await RentalRequest.findAll({ where: { status: "active", dueAt: { [Op.lt]: now }, overdueReminderSentAt: null }, attributes: ["id"], order: [["dueAt", "ASC"]], limit: 500 });
  for (const rental of rentals) await sendRentalOverdueReminder(rental.id);
}
const borrowingInclude = [
  { model: User, as: "member", attributes: ["id", "name", "email"] },
  { model: Book, as: "book", attributes: ["id", "title", "originalPrice"] },
];
async function borrowingDetails(id, transaction) {
  const borrowing = await BookIssue.findByPk(id, { transaction, include: borrowingInclude });
  if (!borrowing) fail("Borrowing not found", 404);
  const fines = await Fine.findAll({ where: { borrowingId: id }, transaction, order: [["id", "ASC"]] });
  const charges = [];
  let balance = 0n;
  for (const fine of fines) {
    const details = await updateStatus(fine, transaction);
    balance += paise(details.balance);
    charges.push({ ...fine.toJSON(), ...details });
  }
  const endDate = borrowing.returnDate || borrowing.lostDate || today();
  return {
    ...borrowing.toJSON(), fines: charges, libraryDate: today(),
    overdueDays: overdueDays(borrowing.dueDate, endDate),
    overdueFine: charges.find(fine => fine.type === "overdue")?.amount || "0.00",
    outstandingAmount: money(balance), rateNeedsReview: borrowing.overdueFineRate == null,
    lostCharge: borrowing.book?.originalPrice ?? null,
    projectedLostOutstanding: borrowing.book?.originalPrice == null ? null : money(balance + paise(borrowing.book.originalPrice)),
  };
}


function startScheduler() {
  const task = cron.schedule("0 * * * *", async () => {
    console.log("[CRON] Starting overdue borrowing synchronization...");

    try {
      await synchronize();
      console.log("[CRON] Overdue borrowing synchronization completed.");
    } catch (error) {
      console.error("[CRON] Overdue synchronization failed:", error);
    }
  });

  const reminderTask = cron.schedule("*/15 * * * *", async () => {
    try {
      await sendOverdueReminders();
    } catch (error) {
      console.error("[CRON] Overdue email reminders failed:", error);
    }
  });

  // Run once when the server starts, to catch up on missed updates.
  void synchronize().catch((error) => {
    console.error("[CRON] Initial overdue synchronization failed:", error);
  });
  void sendOverdueReminders().catch(error => console.error("[CRON] Initial overdue email reminders failed:", error));

  return { task, reminderTask };
}
module.exports = { active, lockOptions, totals, updateStatus, syncBorrowing, synchronize, borrowingDetails, borrowingInclude, sendOverdueReminders, startScheduler };
