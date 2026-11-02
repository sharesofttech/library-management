const columns = [
  "ID", "Member ID", "Member", "Book", "Book Copy ID", "Request ID",
  "Issued By", "Issue Date", "Due Date", "Return Date", "Lost Date",
  "Status", "Created At", "Updated At",
];

const rowsFor = (borrowings) => borrowings.map((borrowing) => [
  borrowing.id,
  borrowing.memberId,
  borrowing.member?.name || "",
  borrowing.book?.title || "",
  borrowing.bookCopyId,
  borrowing.requestId,
  borrowing.issuer?.role?.name || "",
  borrowing.issueDate,
  borrowing.dueDate,
  borrowing.returnDate,
  borrowing.lostDate,
  borrowing.status,
  borrowing.createdAt,
  borrowing.updatedAt,
]);

const xmlEscape = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const buildTableExcelXml = (sheetName, headings, data) => {
  const dataRows = [headings, ...data];
  const rows = dataRows.map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`).join("")}</Row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${xmlEscape(sheetName)}"><Table>${rows}</Table></Worksheet></Workbook>`;
};

const buildExcelXml = (borrowings) => buildTableExcelXml("Borrowings", columns, rowsFor(borrowings));

const pdfSafe = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\x20-\x7E]/g, "?")
  .replace(/[\\()]/g, "\\$&");

const buildTablePdf = (title, headings, data, filters = {}, customWidths) => {
  const records = data.length ? data : [null];
  const pages = [];
  const pageSize = 20;
  const widths = customWidths || headings.map(() => 1094 / headings.length);
  if (!data.length) records[0] = [`No ${title.toLowerCase()} match the selected filters.`, ...headings.slice(1).map(() => "")];

  for (let start = 0; start < records.length; start += pageSize) {
    const pageRecords = records.slice(start, start + pageSize);
    const commands = [
      "q 0.075 0.11 0.20 rg 0 786 1190 56 re f Q",
      "1 1 1 rg",
      `BT /F1 18 Tf 40 814 Td (${pdfSafe(title)}) Tj ET`,
      `BT /F1 9 Tf 40 797 Td (${pdfSafe(`${filters.summary || `Status: ${filters.status || "All"}`}    Search: ${filters.search || "All records"}    Matching records: ${data.length}`)}) Tj ET`,
    ];
    const tableX = 40;
    const headerTop = 770;
    const headerHeight = 28;
    const rowHeight = 30;
    const tableWidth = widths.reduce((sum, width) => sum + width, 0);
    commands.push(`q 0.16 0.27 0.48 rg ${tableX} ${headerTop - headerHeight} ${tableWidth} ${headerHeight} re f Q`);
    let x = tableX;
    headings.forEach((heading, column) => {
      commands.push(`BT /F1 7 Tf ${x + 3} ${headerTop - 17} Td (${pdfSafe(heading)}) Tj ET`);
      x += widths[column];
    });

    pageRecords.forEach((row, rowIndex) => {
      const rowTop = headerTop - headerHeight - rowIndex * rowHeight;
      const rowBottom = rowTop - rowHeight;
      commands.push(rowIndex % 2 === 0
        ? `q 0.95 0.97 0.99 rg ${tableX} ${rowBottom} ${tableWidth} ${rowHeight} re f Q`
        : `q 1 1 1 rg ${tableX} ${rowBottom} ${tableWidth} ${rowHeight} re f Q`);
      const cells = row;
      commands.push("0.10 0.14 0.20 rg");
      x = tableX;
      cells.forEach((value, column) => {
        const width = widths[column];
        commands.push(`q 0.78 0.82 0.88 RG 0.45 w ${x} ${rowBottom} ${width} ${rowHeight} re S Q`);
        const plain = String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
        const maxChars = Math.max(5, Math.floor((width - 8) / 4.2));
        const words = plain.split(/\s+/).filter(Boolean);
        const lines = [""];
        words.forEach((word) => {
          const current = lines[lines.length - 1];
          if ((current ? current.length + 1 : 0) + word.length <= maxChars) {
            lines[lines.length - 1] = current ? `${current} ${word}` : word;
          } else if (lines.length < 2) lines.push(word.slice(0, maxChars));
          else if (!lines[1].endsWith("...")) lines[1] = `${lines[1].slice(0, Math.max(1, maxChars - 3))}...`;
        });
        commands.push(`BT /F1 7 Tf ${x + 4} ${rowBottom + 18} Td (${pdfSafe(lines[0])}) Tj ET`);
        if (lines[1]) commands.push(`BT /F1 7 Tf ${x + 4} ${rowBottom + 8} Td (${pdfSafe(lines[1])}) Tj ET`);
        x += width;
      });
    });
    commands.push(`BT /F1 8 Tf 40 42 Td (${pdfSafe(`Library Portal  |  Page ${pages.length + 1}`)}) Tj ET`);
    const stream = commands.join("\n");
    pages.push(stream);
  }

  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  const pageRefs = [];
  pages.forEach((stream, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    pageRefs.push(`${pageId} 0 R`);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1190 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, "ascii");
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
};

const buildPdf = (borrowings, filters = {}) => buildTablePdf(
  "Borrowing Records",
  ["ID", "Member ID", "Member", "Book", "Copy ID", "Request ID", "Issued By", "Issue Date", "Due Date", "Return Date", "Lost Date", "Status", "Created At", "Updated At"],
  rowsFor(borrowings).map((row) => row.map((value, index) => [7, 8, 9, 10, 12, 13].includes(index) && value ? new Date(value).toISOString().slice(0, 10) : value)),
  filters,
  [42, 55, 110, 175, 55, 55, 70, 76, 76, 76, 76, 68, 80, 80],
);

module.exports = { buildExcelXml, buildTableExcelXml, buildPdf, buildTablePdf };
