import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = process.cwd();
const workbookPath = path.join(outputDir, "Website Test Suite V1.8.xlsx");
const previewDir = path.join(outputDir, "targeted-previews");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

await fs.mkdir(previewDir, { recursive: true });
const targets = [
  ["V 1.8 TEST", "A1:M24", "V18_top"],
  ["V 1.8 TEST", "A500:M529", "V18_tail"],
  ["Automated Tests", "A1:P22", "Automated_top"],
  ["Automated Tests", "A440:P461", "Automated_tail"],
  ["Firebase Tests", "A1:M30", "Firebase_top"],
  ["Firebase Tests", "A31:M59", "Firebase_tail"],
  ["Coverage Matrix", "A1:M18", "Coverage_Matrix"],
  ["Test Data Requirements", "A1:M27", "Test_Data_Requirements"],
];

for (const [sheetName, range, name] of targets) {
  const preview = await workbook.render({ sheetName, range, scale: 0.75, format: "png" });
  await fs.writeFile(path.join(previewDir, `${name}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const sheetStats = workbook.worksheets.items.map((sheet) => {
  const used = sheet.getUsedRange();
  return { name: sheet.name, address: used?.address ?? null, rows: used?.rowCount ?? 0, columns: used?.columnCount ?? 0 };
});
const coverage = await workbook.inspect({ kind: "table", sheetId: "Coverage Matrix", range: "A1:M18", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 13, maxChars: 30000 });
const formulaErrors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "exported workbook formula error scan", maxChars: 10000 });
await fs.writeFile(path.join(outputDir, "final-check.json"), JSON.stringify({ sheetStats, coverage: coverage.ndjson, formulaErrors: formulaErrors.ndjson }, null, 2), "utf8");
console.log(JSON.stringify({ sheetStats, previewDir, formulaErrors: formulaErrors.ndjson }, null, 2));
