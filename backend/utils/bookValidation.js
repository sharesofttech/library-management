function bookPayload(body = {}) {
  const fail = (message) => { const err = new Error(message); err.status = 400; throw err; };
  const text = (field, limit, required = false) => {
    const value = body[field];
    if (value != null && typeof value !== "string") fail(`${field} must be text`);
    const trimmed = value?.trim() || "";
    if (required && !trimmed) fail(`${field} is required`);
    if (trimmed.length > limit) fail(`${field} must be ${limit} characters or fewer`);
    return trimmed || null;
  };
  const integer = (field, min, max) => {
    const raw = body[field];
    if (!((typeof raw === "number" && Number.isInteger(raw)) || (typeof raw === "string" && /^\d+$/.test(raw)))) fail(`${field} must be a whole number`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) fail(`${field} must be between ${min} and ${max}`);
    return value;
  };
  return {
    ...(Object.prototype.hasOwnProperty.call(body, "originalPrice") ? {
      originalPrice: body.originalPrice == null || body.originalPrice === "" ? null : require("./fineCalculation").money(require("./fineCalculation").paise(body.originalPrice)),
    } : {}),
    title: text("title", 200, true),
    isbn: text("isbn", 32, true).replace(/[\s-]/g, "").toUpperCase() || fail("isbn is required"),
    categoryId: integer("categoryId", 1, 2147483647),
    authorId: integer("authorId", 1, 2147483647),
    noofcopies: integer("noofcopies", 0, 1000),
    publisher: text("publisher", 200),
    publishedYear: body.publishedYear == null || body.publishedYear === "" ? null : integer("publishedYear", 1, 9999),
  };
}

module.exports = { bookPayload };
