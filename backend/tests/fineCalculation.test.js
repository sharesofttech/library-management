const { test } = require("node:test");
const assert = require("node:assert/strict");
const { paise, money, today, overdueDays } = require("../utils/fineCalculation");
test("money stays exact and rejects invalid financial inputs", () => {
  assert.equal(money(paise("0.10") + paise("0.20")), "0.30");
  assert.equal(money(paise("99999999.99")), "99999999.99");
  for (const value of [null, undefined, true, {}, "", "-1", "NaN", "1e3", "1.001", "100000000"]) assert.throws(() => paise(value));
});
test("overdue days use calendar boundaries in the library timezone", () => {
  assert.equal(overdueDays("2026-10-28", "2026-10-28"), 0);
  assert.equal(overdueDays("2026-10-28", "2026-10-29"), 1);
  assert.equal(overdueDays("2026-10-28", "2026-10-31"), 3);
  assert.equal(overdueDays("2026-10-28", "2026-10-27"), 0);
  assert.throws(() => overdueDays("2026-02-30", "2026-03-01"));
  const previous = process.env.LIBRARY_TIMEZONE;
  try {
    process.env.LIBRARY_TIMEZONE = "Asia/Kolkata";
    assert.equal(today(new Date("2026-10-28T18:29:59Z")), "2026-10-28");
    assert.equal(today(new Date("2026-10-28T18:30:00Z")), "2026-10-29");
    process.env.LIBRARY_TIMEZONE = "America/New_York";
    assert.equal(today(new Date("2026-10-28T02:00:00Z")), "2026-10-27");
  } finally { if (previous == null) delete process.env.LIBRARY_TIMEZONE; else process.env.LIBRARY_TIMEZONE = previous; }
});
