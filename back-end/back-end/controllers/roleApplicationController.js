const { RoleApplication, User, Role, sequelize } = require("../models");
const sendEmail = require("../utils/sendMail");

const sendDecisionEmail = async (user, role, status, note) => {
  const action = status === "approved" ? "approved" : "not approved";
  const noteText = note ? ` Admin note: ${note}` : "";
  await sendEmail({
    to: user.email,
    subject: `Your ${role} access request was ${action}`,
    text: `Hello ${user.name}, your request for ${role} access was ${action}.${noteText}`,
    html: `<p>Hello ${escapeHtml(user.name)},</p><p>Your request for <strong>${escapeHtml(role)}</strong> access was <strong>${action}</strong>.</p>${note ? `<p>Admin note: ${escapeHtml(note)}</p>` : ""}<p>You can sign in to your Reader account to view your access.</p>`,
  });
};

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

exports.create = async (req, res) => {
  const requestedRole = String(req.body.requestedRole || "").toLowerCase();
  if (!["renter", "librarian"].includes(requestedRole)) return res.status(400).json({ message: "Choose Renter or Librarian access" });
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.user.id, { include: [{ model: Role, as: "role" }], transaction, lock: transaction.LOCK.UPDATE });
      if (!user || user.role?.name !== "user") return { status: 403, body: { message: "Only Reader accounts can request additional access" } };
      if (requestedRole === "renter" && user.isRenter) return { status: 409, body: { message: "Renter access is already active" } };
      if (await RoleApplication.findOne({ where: { userId: user.id, requestedRole, status: "pending" }, transaction })) return { status: 409, body: { message: "You already have a pending request for this access" } };
      const application = await RoleApplication.create({ userId: user.id, requestedRole, status: "pending" }, { transaction });
      return { status: 201, body: { message: `${requestedRole === "renter" ? "Renter" : "Librarian"} access request sent to Admin for review`, application: { id: application.id, requestedRole, status: application.status } } };
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Create Role Application Error:", error);
    return res.status(500).json({ message: "Unable to submit your access request" });
  }
};

exports.getMine = async (req, res) => {
  try {
    const applications = await RoleApplication.findAll({ where: { userId: req.user.id }, attributes: ["id", "requestedRole", "status", "note", "createdAt", "reviewedAt"], order: [["createdAt", "DESC"]], limit: 20 });
    return res.json({ applications });
  } catch (error) {
    console.error("Get My Role Applications Error:", error);
    return res.status(500).json({ message: "Unable to load your access requests" });
  }
};

exports.review = async (req, res) => {
  const decision = String(req.body.decision || "").toLowerCase();
  const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 1000) : "";
  if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ message: "Decision must be approved or rejected" });
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const application = await RoleApplication.findByPk(req.params.id, { include: [{ model: User, as: "applicant" }], transaction, lock: transaction.LOCK.UPDATE });
      if (!application) return { status: 404, body: { message: "Access request not found" } };
      if (application.status !== "pending") return { status: 409, body: { message: "This access request has already been reviewed" } };
      const user = await User.findByPk(application.userId, { include: [{ model: Role, as: "role" }], transaction, lock: transaction.LOCK.UPDATE });
      if (decision === "approved" && application.requestedRole === "renter") user.isRenter = true;
      if (decision === "approved" && application.requestedRole === "librarian") {
        const [role] = await Role.findOrCreate({ where: { name: "librarian" }, defaults: { name: "librarian", description: "Library staff member with library operations access" }, transaction });
        user.roleId = role.id;
      }
      if (decision === "approved") await user.save({ transaction });
      application.status = decision;
      application.note = note || null;
      application.reviewedAt = new Date();
      application.reviewedBy = req.user.id;
      await application.save({ transaction });
      return { status: 200, body: { message: `Access request ${decision}`, application: { id: application.id, requestedRole: application.requestedRole, status: application.status } }, applicant: user, requestedRole: application.requestedRole, note };
    });
    if (result.status === 200) {
      try { await sendDecisionEmail(result.applicant, result.requestedRole, decision, result.note); }
      catch (emailError) { console.error("Role application decision email failed:", emailError.message); }
    }
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Review Role Application Error:", error);
    return res.status(500).json({ message: "Unable to review this access request" });
  }
};
