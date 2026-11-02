const { sequelize, LibrarySettings, BookIssue, BookCopy, Fine, FinePayment, User, Role } = require("../models");
const { fail, paise, money, today } = require("../utils/fineCalculation");
const { Transaction } = require("sequelize");
const transactionOptions = { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED };
const service = require("../utils/fineService");
const { active, lockOptions } = service;
const { parseCsv } = require("../utils/csvImport");
const { getListQuery, withPagination } = require("../utils/listQuery");
const { buildTableExcelXml, buildTablePdf } = require("../utils/borrowingExport");
const libraryTimezone = () => process.env.LIBRARY_TIMEZONE || "Asia/Kolkata";
const wrap = action => async (req, res) => {
  try { await action(req, res); }
  catch (error) {
    if (!error.status) console.error("Fine operation failed:", error);
    const conflict = ["SequelizeUniqueConstraintError", "SequelizeForeignKeyConstraintError"].includes(error.name);
    res.status(error.status || (conflict ? 409 : 500)).json({ message: error.status ? error.message : conflict ? "The record changed. Refresh and try again." : "Unable to complete this operation. Please try again." });
  }
};
exports.validateId = (req, res, next) => {
  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) return res.status(400).json({ message: "Invalid record ID" });
  next();
};
exports.getSettings = wrap(async (req, res) => {
  const settings = await LibrarySettings.findByPk(1, { include: [{ association: "updater", attributes: ["id", "name"] }] });
  res.json({ settings, libraryTimezone: libraryTimezone() });
});
exports.saveSettings = wrap(async (req, res) => {
  const amount = money(paise(req.body.overdueFinePerDay));
  await sequelize.transaction(transactionOptions, async transaction => {
    // Lock the authenticated admin row to serialize first configuration saves.
    await User.findByPk(req.user.id, lockOptions(transaction));
    await LibrarySettings.upsert({ id: 1, overdueFinePerDay: amount, updatedBy: req.user.id }, { transaction });
  });
  res.json({ message: "Fine settings saved successfully" });
});
exports.legacyRate = wrap(async (req, res) => {
  const rate = money(paise(req.body.overdueFineRate));
  await sequelize.transaction(transactionOptions, async transaction => {
    const borrowing = await BookIssue.findByPk(req.params.id, lockOptions(transaction));
    if (!borrowing) fail("Borrowing not found", 404);
    if (!active.includes(borrowing.status) || borrowing.overdueFineRate != null) fail("Only active legacy borrowings without a rate can be reconciled", 409);
    await borrowing.update({ overdueFineRate: rate }, { transaction });
    await service.syncBorrowing(borrowing, transaction);
  });
  res.json({ message: "Historical fine rate recorded. This snapshot cannot be changed." });
});
exports.preview = wrap(async (req, res) => {
  const borrowing = await sequelize.transaction(transactionOptions, async transaction => {
    const row = await BookIssue.findByPk(req.params.id, lockOptions(transaction));
    if (!row) fail("Borrowing not found", 404);
    await service.syncBorrowing(row, transaction);
    return service.borrowingDetails(row.id, transaction);
  });
  res.json({ borrowing });
});
const finish = operation => wrap(async (req, res) => {
  if (operation === "return" && !["good", "damaged"].includes(req.body.condition)) fail("Choose good or damaged book condition");
  const borrowing = await sequelize.transaction(transactionOptions, async transaction => {
    const completedDate = today();
    const row = await BookIssue.findByPk(req.params.id, lockOptions(transaction));
    if (!row) fail("Borrowing not found", 404);
    if (!active.includes(row.status)) fail("This borrowing has already been returned or marked lost", 409);
    if (row.overdueFineRate == null) fail("An admin must verify the historical fine rate before completing this borrowing", 409);
    if (row.issueDate > completedDate) fail("A future-dated borrowing cannot be completed before its issue date", 409);
    const copy = await BookCopy.findByPk(row.bookCopyId, lockOptions(transaction));
    if (!copy || copy.bookId !== row.bookId) fail("Borrowing copy is missing or does not match the book", 409);
    if (copy.status !== "issued") fail("Copy status is inconsistent with this active borrowing. Ask an admin to reconcile it.", 409);
    await service.syncBorrowing(row, transaction, completedDate);
    if (operation === "lost") {
      // Lock book after copy would invert inventory locks, so read its price via
      // one consistent MVCC snapshot; the charge below preserves that value.
      const { Book } = require("../models");
      const book = await Book.findByPk(row.bookId, { transaction });
      if (!book || book.originalPrice == null) fail("Set the original book price in Books before marking this copy lost", 409);
      const amount = money(paise(book.originalPrice));
      await Fine.create({ borrowingId: row.id, type: "lost", amount, status: paise(amount) === 0n ? "Paid" : "Pending" }, { transaction });
      await row.update({ status: "lost", lostDate: completedDate, returnDate: null }, { transaction });
      await copy.update({ status: "lost" }, { transaction });
    } else {
      await row.update({ status: "returned", returnDate: completedDate }, { transaction });
      await copy.update({ status: req.body.condition === "good" ? "available" : "damaged" }, { transaction });
    }
    return service.borrowingDetails(row.id, transaction);
  });
  res.json({ message: operation === "return" ? "Book returned successfully" : "Book marked lost successfully", borrowing });
});
exports.returnBook = finish("return");
exports.lostBook = finish("lost");
const fineInclude = memberId => [{ model: BookIssue, as: "borrowing", ...(memberId == null ? {} : { where: { memberId } }), required: true, attributes: ["id", "memberId", "bookCopyId", "status", "issueDate", "dueDate", "returnDate", "lostDate", "createdAt", "updatedAt"], include: service.borrowingInclude }, { model: FinePayment, as: "payments" }];
const serializeFine = fine => {
  const data = fine.toJSON();
  const paid = data.payments.reduce((sum, payment) => sum + paise(payment.amount), 0n);
  const balance = paise(data.amount) - paid;
  return { ...data, totalPaid: money(paid), balance: money(balance), status: balance === 0n ? "Paid" : paid > 0n ? "Partially paid" : "Pending" };
};
const listFines = own => wrap(async (req, res) => {
  const memberId = own ? req.user.id : undefined;
  await service.synchronize(memberId);
  const { page, limit, search, offset, Op } = getListQuery(req.query);
  const where = {};
  if (req.query.type && ["overdue", "lost"].includes(req.query.type)) where.type = req.query.type;
  if (req.query.status && ["Pending", "Partially paid", "Paid"].includes(req.query.status)) where.status = req.query.status;
  const fines = await Fine.findAll({
    where,
    include: fineInclude(memberId),
    distinct: true,
    order: [["createdAt", "DESC"], ["id", "DESC"]],
  });
  const normalizedSearch = search.toLocaleLowerCase();
  const serialized = fines.map(serializeFine).filter(fine => {
    if (!normalizedSearch) return true;
    const borrowing = fine.borrowing || {};
    const values = [
      fine.id, fine.type, fine.amount, fine.status, fine.totalPaid, fine.balance,
      fine.createdAt, fine.updatedAt, borrowing.id, borrowing.memberId,
      borrowing.bookCopyId, borrowing.status, borrowing.issueDate, borrowing.dueDate,
      borrowing.returnDate, borrowing.lostDate, borrowing.book?.title,
      borrowing.member?.name, borrowing.member?.email,
    ];
    return values.some(value => String(value ?? "").toLocaleLowerCase().includes(normalizedSearch));
  });
  res.json({
    ...withPagination({ fines: serialized.slice(offset, offset + limit), count: serialized.length }, page, limit),
    libraryTimezone: libraryTimezone(),
  });
});
exports.listFines = listFines(false);
exports.myFines = listFines(true);
const paymentInclude = memberId => [
  { model: Fine, as: "fine", required: true, include: [fineInclude(memberId)[0]] },
  { model: User, as: "receiver", attributes: ["id", "name"], include: [{ model: Role, as: "role", attributes: ["name"] }] },
];
const listPayments = own => wrap(async (req, res) => {
  await service.synchronize(own ? req.user.id : undefined);
  const where = {};
  if (req.params.id) {
    if (!await Fine.findByPk(req.params.id)) fail("Fine not found", 404);
    where.fineId = req.params.id;
  }
  if (req.query.paymentMethod) {
    if (!["cash", "upi", "card"].includes(req.query.paymentMethod)) fail("Invalid payment method");
    where.paymentMethod = req.query.paymentMethod;
  }
  const { page, limit, search, offset, Op } = getListQuery(req.query);
  if (req.query.from || req.query.to) where.paymentDate = {
    ...(req.query.from ? { [Op.gte]: new Date(`${req.query.from}T00:00:00.000Z`) } : {}),
    ...(req.query.to ? { [Op.lte]: new Date(`${req.query.to}T23:59:59.999Z`) } : {}),
  };
  if (search) where[Op.or] = [
    { id: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { fineId: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { amount: { [Op.like]: `%${search}%` } },
    { paymentMethod: { [Op.like]: `%${search}%` } },
    { paymentDate: { [Op.like]: `%${search}%` } },
    { createdAt: { [Op.like]: `%${search}%` } },
    { "$receiver.name$": { [Op.like]: `%${search}%` } },
    { "$fine.id$": Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { "$fine.type$": { [Op.like]: `%${search}%` } },
    { "$fine.status$": { [Op.like]: `%${search}%` } },
    { "$fine.borrowing.member.name$": { [Op.like]: `%${search}%` } },
    { "$fine.borrowing.member.email$": { [Op.like]: `%${search}%` } },
    { "$fine.borrowing.book.title$": { [Op.like]: `%${search}%` } },
  ];
  const paged = Boolean(req.query.page || req.query.limit || search || req.query.paymentMethod || req.query.from || req.query.to || req.params.id);
  if (paged) {
    const result = await FinePayment.findAndCountAll({ where, include: paymentInclude(own ? req.user.id : undefined), distinct: true, order: [["paymentDate", "DESC"], ["id", "DESC"]], limit, offset });
    return res.json({ ...withPagination({ payments: result.rows, count: result.count }, page, limit), libraryTimezone: libraryTimezone() });
  }
  res.json({ payments: await FinePayment.findAll({ where, include: paymentInclude(own ? req.user.id : undefined), order: [["paymentDate", "DESC"], ["id", "DESC"]] }), libraryTimezone: libraryTimezone() });
});
exports.listPayments = listPayments(false);
exports.myPayments = listPayments(true);
exports.exportPayments = wrap(async (req, res) => {
  const format = String(req.query.format || "").toLowerCase();
  if (!["pdf", "excel"].includes(format)) fail("Choose either pdf or excel export format");
  await service.synchronize();
  const { Op } = getListQuery(req.query);
  const where = {};
  if (req.params.id) {
    if (!await Fine.findByPk(req.params.id)) fail("Fine not found", 404);
    where.fineId = req.params.id;
  }
  if (req.query.paymentMethod) {
    if (!["cash", "upi", "card"].includes(req.query.paymentMethod)) fail("Invalid payment method");
    where.paymentMethod = req.query.paymentMethod;
  }
  if (req.query.from || req.query.to) where.paymentDate = {
    ...(req.query.from ? { [Op.gte]: new Date(`${req.query.from}T00:00:00.000Z`) } : {}),
    ...(req.query.to ? { [Op.lte]: new Date(`${req.query.to}T23:59:59.999Z`) } : {}),
  };
  const { search } = getListQuery(req.query);
  if (search) where[Op.or] = [
    { id: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { fineId: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { amount: { [Op.like]: `%${search}%` } },
    { paymentMethod: { [Op.like]: `%${search}%` } },
    { paymentDate: { [Op.like]: `%${search}%` } },
    { "$receiver.name$": { [Op.like]: `%${search}%` } },
    { "$fine.borrowing.member.name$": { [Op.like]: `%${search}%` } },
    { "$fine.borrowing.member.email$": { [Op.like]: `%${search}%` } },
    { "$fine.borrowing.book.title$": { [Op.like]: `%${search}%` } },
    { "$fine.type$": { [Op.like]: `%${search}%` } },
    { "$fine.status$": { [Op.like]: `%${search}%` } },
  ];
  const payments = await FinePayment.findAll({
    where,
    include: paymentInclude(),
    order: [["paymentDate", "DESC"], ["id", "DESC"]],
  });
  const timezone = libraryTimezone();
  const localDate = (value) => {
    if (!value) return "";
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date(value));
    return ["day", "month", "year"].map((type) => parts.find((part) => part.type === type)?.value || "").join("/");
  };
  const headings = ["Payment ID", "Fine ID", "Borrowing ID", "Member", "Book", "Amount Paid", "Payment Date", "", "Received By", "Created At", "Updated At"];
  const rows = payments.map((payment) => {
    const data = payment.toJSON();
    const borrowing = data.fine?.borrowing;
    const receiver = data.receiver;
    const receivedBy = receiver ? `${receiver.name || "Staff"}${receiver.role?.name ? ` (${receiver.role.name})` : ""}` : "";
    return [
      data.id, data.fineId, borrowing?.id, borrowing?.member?.name || "",
      borrowing?.book?.title || "", data.amount, localDate(data.paymentDate),
      data.paymentMethod, receivedBy, localDate(data.createdAt), localDate(data.updatedAt),
    ];
  });
  const summary = [
    req.query.paymentMethod ? `Method: ${req.query.paymentMethod}` : "Method: All",
    req.query.from ? `From: ${req.query.from}` : "",
    req.query.to ? `To: ${req.query.to}` : "",
    req.params.id ? `Fine ID: ${req.params.id}` : "",
  ].filter(Boolean).join("    ");
  const datePart = new Date().toISOString().slice(0, 10);
  const isPdf = format === "pdf";
  const filename = `fine-payments-${datePart}.${isPdf ? "pdf" : "xls"}`;
  const body = isPdf
    ? buildTablePdf("Fine Payments", headings, rows, { summary, search }, [62, 62, 76, 150, 200, 82, 86, 85, 130, 100, 100])
    : Buffer.from(`\uFEFF${buildTableExcelXml("Fine Payments", headings, rows)}`, "utf8");
  res.set({
    "Content-Type": isPdf ? "application/pdf" : "application/vnd.ms-excel; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  res.send(body);
});
exports.recordPayment = wrap(async (req, res) => {
  const amount = paise(req.body.amount);
  if (amount === 0n) fail("Payment amount must be greater than zero");
  if (req.body.paymentMethod !== "cash") fail("Payment method must be cash");
  const result = await sequelize.transaction(transactionOptions, async transaction => {
    const reference = await Fine.findByPk(req.params.id, { transaction });
    if (!reference) fail("Fine not found", 404);
    const borrowing = await BookIssue.findByPk(reference.borrowingId, lockOptions(transaction));
    if (!borrowing) fail("Borrowing not found", 404);
    await service.syncBorrowing(borrowing, transaction);
    const fine = await Fine.findByPk(reference.id, lockOptions(transaction));
    const { balance } = await service.totals(fine, transaction);
    if (amount > balance) fail("Payment cannot exceed the current remaining balance", 409);
    const payment = await FinePayment.create({ fineId: fine.id, amount: money(amount), paymentMethod: req.body.paymentMethod, receivedBy: req.user.id, paymentDate: new Date() }, { transaction });
    const details = await service.updateStatus(fine, transaction);
    return { payment, fine: { ...fine.toJSON(), ...details } };
  });
  res.status(201).json({ message: "Payment recorded successfully", ...result });
});

exports.importPayments = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose a CSV file to import" });
  const headers = ["importReference", "fineId", "amount", "paymentDate", "paymentMethod"];
  let rows;
  try { rows = parseCsv(req.file.buffer, headers); }
  catch (error) { return res.status(error.status || 400).json({ message: error.message }); }

  let currentRow = 0;
  try {
    const imported = await sequelize.transaction(transactionOptions, async transaction => {
      const seenReferences = new Set();
      const results = [];
      for (let index = 0; index < rows.length; index += 1) {
        currentRow = index + 2;
        const data = rows[index];
        const reference = data.importReference.trim();
        const fineId = Number(data.fineId);
        const amount = paise(data.amount);
        const method = data.paymentMethod.toLowerCase();
        const paymentDate = /^\d{4}-\d{2}-\d{2}$/.test(data.paymentDate)
          ? new Date(`${data.paymentDate}T12:00:00.000Z`)
          : new Date(data.paymentDate);
        if (!reference || reference.length > 120) throw new Error("importReference is required and must be 120 characters or fewer");
        if (seenReferences.has(reference)) throw new Error("importReference values must be unique within the CSV file");
        seenReferences.add(reference);
        if (!Number.isSafeInteger(fineId) || fineId < 1) throw new Error("fineId must be a positive whole number");
        if (amount <= 0n) throw new Error("amount must be greater than zero");
        if (Number.isNaN(paymentDate.getTime())) throw new Error("paymentDate must be YYYY-MM-DD or an ISO date-time");
        if (!["cash", "upi", "card"].includes(method)) throw new Error("paymentMethod must be cash, upi, or card");
        if (await FinePayment.findOne({ where: { importReference: reference }, transaction })) throw new Error(`importReference '${reference}' was already imported`);

        const referenceFine = await Fine.findByPk(fineId, { transaction });
        if (!referenceFine) throw new Error(`Fine #${fineId} was not found`);
        const borrowing = await BookIssue.findByPk(referenceFine.borrowingId, lockOptions(transaction));
        if (!borrowing) throw new Error(`Borrowing for Fine #${fineId} was not found`);
        await service.syncBorrowing(borrowing, transaction);
        const fine = await Fine.findByPk(fineId, lockOptions(transaction));
        const { balance } = await service.totals(fine, transaction);
        if (amount > balance) throw Object.assign(new Error(`Payment for Fine #${fineId} exceeds its remaining balance`), { status: 409 });
        const payment = await FinePayment.create({ fineId, amount: money(amount), paymentDate, paymentMethod: method, receivedBy: req.user.id, importReference: reference }, { transaction });
        await service.updateStatus(fine, transaction);
        results.push({ row: currentRow, paymentId: payment.id, fineId, importReference: reference });
      }
      return results;
    });
    return res.status(201).json({ message: `${imported.length} fine payments imported`, importedCount: imported.length, records: imported });
  } catch (error) {
    console.error("Import fine payments failed:", error.message);
    const status = error.status || (error.name === "SequelizeUniqueConstraintError" ? 409 : 400);
    return res.status(status).json({ message: `CSV row ${currentRow}: ${error.message}. No rows were imported.` });
  }
};
