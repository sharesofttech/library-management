const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html, text }) => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";

  if (!user || !pass) {
    console.log("---- EMAIL (dev mode) ----");
    console.log("To:", to);
    console.log(text);
    console.log("--------------------------");
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from: `"Auth Demo" <${user}>`,
    to,
    subject,
    html,
    text,
  });

  console.log("Email sent successfully to:", to, "MessageId:", info.messageId);
  return info;
};

module.exports = sendEmail;
