
const {
  sequelize,
  Book,
  BookCopy,
  BookRequest,
  BookIssue,
  User,
  Role,
  LibrarySettings,
  Fine,
} = require("../models");
const { Op } = require("sequelize");
const fineService = require("../utils/fineService");
const { parseCsv } = require("../utils/csvImport");
const { validDate, today, paise, money, overdueDays } = require("../utils/fineCalculation");
const { getListQuery, withPagination } = require("../utils/listQuery");
const { buildExcelXml, buildPdf } = require("../utils/borrowingExport");

exports.issueBook = async (req, res) => {
  try {
    const { requestId, bookCopyId, issueDate, dueDate } = req.body;

    const requestIdNumber = Number(requestId);
    const copyIdNumber = Number(bookCopyId);

    if (
      !Number.isSafeInteger(requestIdNumber) ||
      requestIdNumber <= 0 ||
      !Number.isSafeInteger(copyIdNumber) ||
      copyIdNumber <= 0
    ) {
      return res.status(400).json({
        message: "Valid request and book copy are required",
      });
    }

    const validDate = (value) => {
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return false;
      }

      const parsed = new Date(`${value}T00:00:00Z`);

      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    };

    if (
      !validDate(issueDate) ||
      !validDate(dueDate) ||
      dueDate <= issueDate
    ) {
      return res.status(400).json({
        message: "Due date must be after issue date",
      });
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        // Lock request first
        
        const request = await BookRequest.findByPk(
          requestIdNumber,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          }
        );

        if (!request) {
          return {
            status: 404,
            message: "Book request not found",
          };
        }

        if (request.status !== "Approved") {
          return {
            status: 409,
            message: "Only approved requests can be issued",
          };
        }

        // Lock book, matching existing inventory lock order
        const book = await Book.findByPk(request.bookId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!book) {
          return {
            status: 404,
            message: "Book not found",
          };
        }

        const copy = await BookCopy.findOne({
          where: {
            id: copyIdNumber,
            bookId: request.bookId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!copy) {
          return {
            status: 404,
            message: "Selected book copy not found",
          };
        }

        if (copy.status !== "available") {
          return {
            status: 409,
            message: "Selected book copy is not available",
          };
        }

        const activeIssue = await BookIssue.findOne({
          where: { bookCopyId: copy.id, status: { [Op.in]: fineService.active } },
          transaction, lock: transaction.LOCK.UPDATE,
        });
        if (activeIssue) return { status: 409, message: "This copy already has an active borrowing" };
        const settings = await LibrarySettings.findByPk(1, { transaction, lock: transaction.LOCK.SHARE });
        if (!settings) return { status: 409, message: "An admin must configure Fine Settings before issuing books" };

        const existingIssue = await BookIssue.findOne({
          where: {
            requestId: request.id,
          },
          transaction,
        });

        if (existingIssue) {
          return {
            status: 409,
            message: "This request has already been issued",
          };
        }

        const issue = await BookIssue.create(
          {
            requestId: request.id,
            memberId: request.memberId,
            bookId: request.bookId,
            bookCopyId: copy.id,
            issueDate,
            dueDate,
            issuedBy: req.user.id,
            overdueFineRate: settings.overdueFinePerDay,
          },
          { transaction }
        );

        await copy.update(
          { status: "issued" },
          { transaction }
        );

        await request.update(
          { status: "Fulfilled" },
          { transaction }
        );

        return { issue };
      }
    );

    if (result.status) {
      return res.status(result.status).json({
        message: result.message,
      });
    }

    return res.status(201).json({
      message: "Book issued successfully",
      issue: result.issue,
    });
  } catch (error) {
    console.error("Issue Book Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "This book request has already been issued",
      });
    }

    return res.status(500).json({
      message: "Failed to issue book",
    });
  }
};


exports.getBorrowings = async (req, res) => {
  try {
    await fineService.synchronize();
    const { where, include, order, page, limit, offset, search } = borrowingListOptions(req.query);
    const paged = Boolean(req.query.page || req.query.limit || search || req.query.status);
    const result = paged
      ? await BookIssue.findAndCountAll({ where, include, distinct: true, order, limit, offset })
      : null;
    const issues = result ? result.rows : await BookIssue.findAll({ where, include, order });
    const borrowings = issues.map(serializeBorrowing);
    return res.status(200).json(result
      ? withPagination({ borrowings, count: result.count }, page, limit)
      : { borrowings });
  } catch (error) {
    console.error("Get Borrowings Error:", error);
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);

    return res.status(500).json({
      message: "Failed to fetch borrowings",
    });
  }
};

const borrowingListOptions = (query) => {
  const { page, limit, search, offset } = getListQuery(query);
  const where = {};
  if (query.status && ["issued", "returned", "overdue", "lost"].includes(query.status)) where.status = query.status;
  if (search) where[Op.or] = [
    { id: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { memberId: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { bookCopyId: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { requestId: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { issuedBy: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
    { issueDate: { [Op.like]: `%${search}%` } },
    { dueDate: { [Op.like]: `%${search}%` } },
    { returnDate: { [Op.like]: `%${search}%` } },
    { lostDate: { [Op.like]: `%${search}%` } },
    { status: { [Op.like]: `%${search}%` } },
    { createdAt: { [Op.like]: `%${search}%` } },
    { updatedAt: { [Op.like]: `%${search}%` } },
    { "$book.isbn$": { [Op.like]: `%${search}%` } },
    { "$book.title$": { [Op.like]: `%${search}%` } },
    { "$member.name$": { [Op.like]: `%${search}%` } },
    { "$member.email$": { [Op.like]: `%${search}%` } },
    { "$member.phone$": { [Op.like]: `%${search}%` } },
    { "$issuer.name$": { [Op.like]: `%${search}%` } },
  ];
  const include = [
    { model: Book, as: "book", attributes: ["id", "title", "originalPrice"] },
    { model: User, as: "member", attributes: ["id", "name"] },
    { model: User, as: "issuer", attributes: ["id", "name", "roleId"], required: false,
      include: [{ model: Role, as: "role", attributes: ["id", "name"], required: false }] },
  ];
  return { where, include, order: [["createdAt", "DESC"]], page, limit, offset, search };
};

const serializeBorrowing = (issue) => {
  const data = issue.toJSON();
  return {
    id: data.id,
    memberId: data.memberId,
    bookCopyId: data.bookCopyId,
    requestId: data.requestId,
    issuedBy: data.issuedBy,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    returnDate: data.returnDate ?? null,
    lostDate: data.lostDate ?? null,
    overdueFineRate: data.overdueFineRate,
    book: data.book,
    member: data.member,
    status: data.status ?? "issued",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    issuer: data.issuer ? {
      id: data.issuer.id,
      name: data.issuer.name,
      role: data.issuer.role ? { id: data.issuer.role.id, name: data.issuer.role.name } : null,
    } : null,
  };
};

exports.exportBorrowings = async (req, res) => {
  try {
    const format = String(req.query.format || "").toLowerCase();
    if (!["pdf", "excel"].includes(format)) {
      return res.status(400).json({ message: "Choose either pdf or excel export format" });
    }
    await fineService.synchronize();
    const { where, include, order } = borrowingListOptions(req.query);
    const issues = await BookIssue.findAll({ where, include, order });
    const borrowings = issues.map(serializeBorrowing);
    const datePart = new Date().toISOString().slice(0, 10);
    const isPdf = format === "pdf";
    const filename = `borrowings-${datePart}.${isPdf ? "pdf" : "xls"}`;
    const body = isPdf
      ? buildPdf(borrowings, { status: req.query.status, search: req.query.search })
      : Buffer.from(`\uFEFF${buildExcelXml(borrowings)}`, "utf8");
    res.set({
      "Content-Type": isPdf ? "application/pdf" : "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return res.status(200).send(body);
  } catch (error) {
    console.error("Export Borrowings Error:", error);
    return res.status(500).json({ message: "Failed to export borrowing records" });
  }
};

exports.importBorrowings = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose a CSV file to import" });
  const headers = ["requestId", "memberId", "bookCopyId", "issueDate", "dueDate", "status", "returnDate", "lostDate", "overdueFineRate"];
  let rows;
  try { rows = parseCsv(req.file.buffer, headers); }
  catch (error) { return res.status(error.status || 400).json({ message: error.message }); }

  let currentRow = 0;
  try {
    const imported = await sequelize.transaction(async transaction => {
      const results = [];
      for (let index = 0; index < rows.length; index += 1) {
        currentRow = index + 2;
        const data = rows[index];
        const requestId = data.requestId ? Number(data.requestId) : null;
        const memberId = data.memberId ? Number(data.memberId) : null;
        const copyId = Number(data.bookCopyId);
        const status = data.status.toLowerCase();
        if ((requestId != null && (!Number.isSafeInteger(requestId) || requestId < 1)) || (requestId == null && (!Number.isSafeInteger(memberId) || memberId < 1)) || !Number.isSafeInteger(copyId) || copyId < 1) throw new Error("Provide an existing requestId, or a memberId for a historical borrowing, and a positive bookCopyId");
        if (!["issued", "overdue", "returned", "lost"].includes(status)) throw new Error("status must be issued, overdue, returned, or lost");
        if (!validDate(data.issueDate) || !validDate(data.dueDate) || data.dueDate <= data.issueDate) throw new Error("issueDate and dueDate must be valid YYYY-MM-DD dates, with dueDate after issueDate");
        if (data.issueDate > today()) throw new Error("issueDate cannot be in the future");
        const terminalDate = status === "returned" ? data.returnDate : status === "lost" ? data.lostDate : "";
        if ((status === "returned" || status === "lost") && !validDate(terminalDate)) throw new Error(`${status === "returned" ? "returnDate" : "lostDate"} is required for this status`);
        if ((status === "issued" || status === "overdue") && (data.returnDate || data.lostDate)) throw new Error("Active borrowings must not include returnDate or lostDate");
        if ((data.returnDate && !validDate(data.returnDate)) || (data.lostDate && !validDate(data.lostDate))) throw new Error("returnDate and lostDate must use YYYY-MM-DD format");
        if (terminalDate && (terminalDate < data.issueDate || terminalDate > today())) throw new Error("Return/lost date must be between issueDate and today");
        if (status === "overdue" && data.dueDate >= today()) throw new Error("An overdue borrowing must have a dueDate before today");
        const rate = data.overdueFineRate === "" ? null : money(paise(data.overdueFineRate));

        let request = requestId == null ? null : await BookRequest.findByPk(requestId, { transaction, lock: transaction.LOCK.UPDATE });
        if (requestId != null && (!request || request.status !== "Approved")) throw new Error("requestId must refer to an existing Approved book request");
        const initialCopy = await BookCopy.findByPk(copyId, { transaction });
        if (!initialCopy || (request && initialCopy.bookId !== request.bookId)) throw new Error("bookCopyId must belong to the requested book");
        const book = await Book.findByPk(request?.bookId || initialCopy.bookId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!book) throw new Error("The requested book no longer exists");
        const copy = await BookCopy.findOne({ where: { id: copyId, bookId: book.id }, transaction, lock: transaction.LOCK.UPDATE });
        if (!copy || copy.status !== "available") throw new Error("bookCopyId must be an available copy of the request's book");
        if (!request) {
          const member = await User.findByPk(memberId, { transaction, include: [{ model: Role, as: "role", attributes: ["name"] }] });
          if (!member || member.role?.name !== "user") throw new Error("memberId must refer to an existing Reader account");
          request = await BookRequest.create({ memberId, bookId: book.id, requestDate: new Date(`${data.issueDate}T12:00:00.000Z`), status: "Fulfilled", approvedBy: req.user.id }, { transaction });
        }
        if (await BookIssue.findOne({ where: { requestId: request.id }, transaction })) throw new Error("This request already has a borrowing record");
        const activeIssue = await BookIssue.findOne({ where: { bookCopyId: copyId, status: { [Op.in]: fineService.active } }, transaction, lock: transaction.LOCK.UPDATE });
        if (activeIssue) throw new Error("This copy already has an active borrowing");

        const issue = await BookIssue.create({ requestId: request.id, memberId: request.memberId, bookId: request.bookId, bookCopyId: copyId, issueDate: data.issueDate, dueDate: data.dueDate, returnDate: status === "returned" ? data.returnDate : null, lostDate: status === "lost" ? data.lostDate : null, status: status === "overdue" ? "issued" : status, overdueFineRate: rate, issuedBy: req.user.id }, { transaction });
        const copyStatus = status === "issued" || status === "overdue" ? "issued" : status === "lost" ? "lost" : "available";
        await copy.update({ status: copyStatus }, { transaction });
        await request.update({ status: "Fulfilled" }, { transaction });
        if (status === "issued" || status === "overdue") {
          await fineService.syncBorrowing(issue, transaction);
        } else {
          const daysLate = overdueDays(data.dueDate, terminalDate);
          if (rate != null && daysLate > 0) {
            const overdueAmount = money(BigInt(daysLate) * paise(rate));
            if (paise(overdueAmount) > 0n) await Fine.create({ borrowingId: issue.id, type: "overdue", amount: overdueAmount }, { transaction });
          }
          if (status === "lost") {
            if (book.originalPrice == null) throw new Error("Set the book original price before importing a lost borrowing");
            const lostAmount = money(paise(book.originalPrice));
            await Fine.create({ borrowingId: issue.id, type: "lost", amount: lostAmount, status: paise(lostAmount) === 0n ? "Paid" : "Pending" }, { transaction });
          }
        }
        const fines = await Fine.findAll({ where: { borrowingId: issue.id }, attributes: ["id", "type", "amount"], transaction });
        results.push({ row: currentRow, borrowingId: issue.id, status: issue.status, fineIds: fines.map(fine => ({ id: fine.id, type: fine.type, amount: fine.amount })) });
      }
      return results;
    });
    return res.status(201).json({ message: `${imported.length} borrowing records imported`, importedCount: imported.length, records: imported });
  } catch (error) {
    console.error("Import borrowings failed:", error.message);
    return res.status(error.name === "SequelizeUniqueConstraintError" ? 409 : 400).json({ message: `CSV row ${currentRow}: ${error.message}. No rows were imported.` });
  }
};


