const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
const MAX_PAISE = 9999999999n;
function paise(value) {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d{1,8}(\.\d{1,2})?$/.test(String(value))) fail("Enter a nonnegative amount with at most two decimal places");
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function money(value) {
  if (value < 0n || value > MAX_PAISE) fail("Calculated fine exceeds the supported monetary range", 409);
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.LIBRARY_TIMEZONE || "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function overdueDays(dueDate, endDate = today()) {
  if (!validDate(dueDate) || !validDate(endDate)) fail("Invalid borrowing calendar date", 409);
  return Math.max(0, Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86400000));
}
module.exports = { fail, paise, money, today, validDate, overdueDays };
