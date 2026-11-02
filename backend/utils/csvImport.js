const MAX_ROWS = 500;

function parseCsv(buffer, expectedHeaders) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell.trim()); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim()); cell = "";
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw Object.assign(new Error("CSV contains an unclosed quoted field"), { status: 400 });
  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  if (!rows.length) throw Object.assign(new Error("CSV file is empty"), { status: 400 });
  const headers = rows.shift().map(value => value.trim());
  if (headers.length !== expectedHeaders.length || expectedHeaders.some((header, index) => headers[index] !== header)) {
    throw Object.assign(new Error(`CSV headers must be exactly: ${expectedHeaders.join(", ")}`), { status: 400 });
  }
  if (!rows.length) throw Object.assign(new Error("CSV has no data rows"), { status: 400 });
  if (rows.length > MAX_ROWS) throw Object.assign(new Error(`Import is limited to ${MAX_ROWS} rows per file`), { status: 400 });
  if (rows.some(values => values.length !== headers.length)) throw Object.assign(new Error("Each CSV row must have the same number of columns as the header"), { status: 400 });
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index]])));
}

module.exports = { parseCsv, MAX_ROWS };
