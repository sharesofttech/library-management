
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Role,
  Book,
  BookRequest,
} = require("../models");
const { getListQuery, withPagination } = require("../utils/listQuery");

const STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
  "Fulfilled",
];

const getCurrentUserId = (req) => {
  return req.user?.id;
};

const getCurrentUser = async (req) => {
  const id = getCurrentUserId(req);
  if (!id) return null;

  return User.findByPk(id, {
    include: [
      {
        model: Role,
        as: "role",
        attributes: ["id", "name"],
      },
    ],
  });
};

const getRoleName = (user) =>
  user?.role?.name?.toLowerCase() || "";

const isStaff = (user) =>
  ["admin", "librarian"].includes(getRoleName(user));

const isMember = (user) =>
  getRoleName(user) === "user" || 
  getRoleName(user) === "member" ;

const includes = [
  {
    model: User,
    as: "member",
    attributes: ["id", "name","email","countryCode","phone"],
  },
  {
    model: Book,
    as: "book",
    attributes: ["id", "title", "isbn", "bookImg"],
  },
  {
    model: User,
    as: "approver",
    attributes: ["id", "name","email"],
    required: false,
  },
];

// 1. CREATE BOOK REQUEST
exports.createRequest = async (req, res) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!isMember(user)) {
      return res.status(403).json({
        message: "Only members can request books",
      });
    }

    const bookId = Number(req.body.bookId);

    if (!Number.isSafeInteger(bookId) || bookId <= 0) {
      return res.status(400).json({
        message: "Valid bookId is required",
      });
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        const book = await Book.findByPk(bookId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!book) {
          return {
            code: 404,
            message: "Book not found",
          };
        }

        const existing = await BookRequest.findOne({
          where: {
            memberId: user.id,
            bookId,
            status: {
              [Op.in]: ["Pending", "Approved"],
            },
          },
          transaction,
        });

        if (existing) {
          return {
            code: 409,
            message:
              "You already have an active request for this book",
          };
        }

        const request = await BookRequest.create(
          {
            memberId: user.id,
            bookId,
            requestDate: new Date(),
            status: "Pending",
            approvedBy: null,
          },
          { transaction }
        );

        return { request };
      }
    );

    if (result.code) {
      return res.status(result.code).json({
        message: result.message,
      });
    }

    return res.status(201).json({
      message: "Book request submitted successfully",
      request: result.request,
    });
  } catch (error) {
    console.error("Create request error:", error);

    return res.status(500).json({
      message: "Failed to create book request",
    });
  }
};

// 2. GET MY REQUESTS
exports.getMyRequests = async (req, res) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!isMember(user)) {
      return res.status(403).json({
        message: "Only members can view their requests",
      });
    }

    const { page, limit, search, offset, Op } = getListQuery(req.query);
    const where = { memberId: user.id };
    if (search) where[Op.or] = [
      { id: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
      { status: { [Op.like]: `%${search}%` } },
      { requestDate: { [Op.like]: `%${search}%` } },
      { createdAt: { [Op.like]: `%${search}%` } },
      { updatedAt: { [Op.like]: `%${search}%` } },
      { "$book.title$": { [Op.like]: `%${search}%` } },
      { "$book.isbn$": { [Op.like]: `%${search}%` } },
    ];
    const include = [
        {
          model: Book,
          as: "book",
          attributes: ["id", "title", "isbn", "bookImg"],
        },
      ];
    const paged = Boolean(req.query.page || req.query.limit || search);
    const result = paged ? await BookRequest.findAndCountAll({ where, include, distinct: true, order: [["createdAt", "DESC"]], limit, offset }) : null;
    const requests = result ? result.rows : await BookRequest.findAll({ where, include, order: [["createdAt", "DESC"]] });

    return res.status(200).json(result
      ? withPagination({ requests, count: result.count }, page, limit)
      : { requests });
  } catch (error) {
    console.error("Get my requests error:", error);

    return res.status(500).json({
      message: "Failed to fetch requests",
    });
  }
};

// 3. GET ALL REQUESTS (ADMIN / LIBRARIAN)
exports.getAllRequests = async (req, res) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!isStaff(user)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const { status } = req.query;
    const { page, limit, search, offset, Op } = getListQuery(req.query);

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid request status",
      });
    }

    const where = status ? { status } : {};
    if (search) where[Op.or] = [
      { id: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
      { memberId: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
      { bookId: Number.isSafeInteger(Number(search)) ? Number(search) : -1 },
      { status: { [Op.like]: `%${search}%` } },
      { createdAt: { [Op.like]: `%${search}%` } },
      { updatedAt: { [Op.like]: `%${search}%` } },
      { "$member.name$": { [Op.like]: `%${search}%` } },
      { "$member.email$": { [Op.like]: `%${search}%` } },
      { "$member.phone$": { [Op.like]: `%${search}%` } },
      { "$book.title$": { [Op.like]: `%${search}%` } },
      { "$book.isbn$": { [Op.like]: `%${search}%` } },
      { "$approver.name$": { [Op.like]: `%${search}%` } },
      { "$approver.email$": { [Op.like]: `%${search}%` } },
    ];
    const paged = Boolean(req.query.page || req.query.limit || search);
    const result = paged ? await BookRequest.findAndCountAll({ where, include: includes, distinct: true, order: [["createdAt", "DESC"]], limit, offset }) : null;
    const requests = result ? result.rows : await BookRequest.findAll({ where, include: includes, order: [["createdAt", "DESC"]] });

    return res.status(200).json(result
      ? withPagination({ requests, count: result.count }, page, limit)
      : { requests });
  } catch (error) {
    console.error("Get all requests error:", error);

    return res.status(500).json({
      message: "Failed to fetch book requests",
    });
  }
};

// 4. GET PENDING REQUEST COUNT
exports.getPendingCount = async (req, res) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!isStaff(user)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const count = await BookRequest.count({
      where: {
        status: "Pending",
      },
    });

    return res.status(200).json({
      count,
    });
  } catch (error) {
    console.error("Pending count error:", error);

    return res.status(500).json({
      message: "Failed to fetch pending count",
    });
  }
};

// 5. APPROVE / REJECT REQUEST
exports.updateRequestStatus = async (req, res) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!isStaff(user)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const { status } = req.body;
    const requestId = Number(req.params.id);

    if (!Number.isSafeInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Invalid request ID",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Use Approved or Rejected",
      });
    }

    const result = await sequelize.transaction(
      async (transaction) => {
        const request = await BookRequest.findByPk(
          requestId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          }
        );

        if (!request) {
          return {
            code: 404,
            message: "Book request not found",
          };
        }

        if (request.status !== "Pending") {
          return {
            code: 409,
            message: "Only pending requests can be updated",
          };
        }

        request.status = status;
        request.approvedBy =
          status === "Approved" ? user.id : null;

        await request.save({ transaction });

        return { request };
      }
    );

    if (result.code) {
      return res.status(result.code).json({
        message: result.message,
      });
    }

    return res.status(200).json({
      message: `Request ${status.toLowerCase()} successfully`,
      request: result.request,
    });
  } catch (error) {
    console.error("Update request status error:", error);

    return res.status(500).json({
      message: "Failed to update request",
    });
  }
};

// 6. CANCEL REQUEST (MEMBER)
exports.cancelRequest = async (req, res) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!isMember(user)) {
      return res.status(403).json({
        message: "Only members can cancel requests",
      });
    }

    const requestId = Number(req.params.id);

    if (!Number.isSafeInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Invalid request ID",
      });
    }

    const [updated] = await BookRequest.update(
      {
        status: "Cancelled",
      },
      {
        where: {
          id: requestId,
          memberId: user.id,
          status: "Pending",
        },
      }
    );

    if (!updated) {
      return res.status(409).json({
        message:
          "Request not found or cannot be cancelled",
      });
    }

    return res.status(200).json({
      message: "Book request cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel request error:", error);

    return res.status(500).json({
      message: "Failed to cancel request",
    });
  }
};
