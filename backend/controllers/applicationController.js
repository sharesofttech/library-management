const { User, Role, RoleApplication, sequelize } = require("../models");
const sendEmail = require("../utils/sendMail");

exports.getPendingApplications = async (req, res) => {
  try {
    const [accountApplications, roleApplications] = await Promise.all([User.findAll({
      where: { approvalStatus: "pending" },
      attributes: [
        "id",
        "name",
        "email",
        "countryCode",
        "phone",
        "requestedRole",
        "approvalStatus",
        "createdAt",
      ],
      order: [["createdAt", "ASC"]],
    }), RoleApplication.findAll({
      where: { status: "pending" },
      include: [{ model: User, as: "applicant", attributes: ["name", "email", "countryCode", "phone"] }],
      order: [["createdAt", "ASC"]],
    })]);

    const applications = [
      ...accountApplications.map((application) => ({ ...application.toJSON(), kind: "account", key: `account-${application.id}` })),
      ...roleApplications.map((application) => ({ id: application.id, kind: "role", key: `role-${application.id}`, name: application.applicant.name, email: application.applicant.email, countryCode: application.applicant.countryCode, phone: application.applicant.phone, requestedRole: application.requestedRole, approvalStatus: application.status, createdAt: application.createdAt })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return res.json({ applications });
  } catch (error) {
    console.error("Get Pending Applications Error:", error);
    return res.status(500).json({ message: "Failed to load account applications" });
  }
};

exports.reviewApplication = async (req, res) => {
  const decision = String(req.body.decision || "").toLowerCase();
  const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 1000) : "";

  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "Decision must be approved or rejected" });
  }

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const application = await User.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!application) return { status: 404, body: { message: "Application not found" } };
      if (application.approvalStatus !== "pending") {
        return { status: 409, body: { message: "This application has already been reviewed" } };
      }

      if (decision === "approved" && application.requestedRole === "librarian") {
        const [librarianRole] = await Role.findOrCreate({
          where: { name: "librarian" },
          defaults: { name: "librarian", description: "Library staff member with library operations access" },
          transaction,
        });
        application.roleId = librarianRole.id;
      } else if (decision === "approved" && application.requestedRole === "renter") {
        // Renters remain library Members and receive a separate capability.
        application.isRenter = true;
      }

      application.approvalStatus = decision;
      application.approvalReviewedAt = new Date();
      application.approvalReviewedBy = req.user.id;
      application.approvalNote = note || null;
      await application.save({ transaction });

      return {
        status: 200,
        applicant: application,
        requestedRole: application.requestedRole,
        body: {
          message: `Application ${decision}`,
          application: {
            id: application.id,
            approvalStatus: application.approvalStatus,
            requestedRole: application.requestedRole,
            isRenter: Boolean(application.isRenter),
          },
        },
      };
    });

    if (result.status === 200 && result.applicant) {
      try {
        const statusText = decision === "approved" ? "approved" : "not approved";
        const escape = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
        await sendEmail({ to: result.applicant.email, subject: `Your ${result.requestedRole} access request was ${statusText}`, text: `Hello ${result.applicant.name}, your ${result.requestedRole} access request was ${statusText}.${note ? ` Admin note: ${note}` : ""}`, html: `<p>Hello ${escape(result.applicant.name)},</p><p>Your ${escape(result.requestedRole)} access request was <strong>${statusText}</strong>.</p>${note ? `<p>Admin note: ${escape(note)}</p>` : ""}` });
      } catch (emailError) { console.error("Account application decision email failed:", emailError.message); }
    }
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Review Application Error:", error);
    return res.status(500).json({ message: "Failed to review account application" });
  }
};
