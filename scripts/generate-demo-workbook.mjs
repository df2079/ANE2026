import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const outputDir = path.resolve(process.cwd(), "demo");
const outputFile = path.join(outputDir, "art-niche-expo-awards-2026-demo.xlsx");

const workbookData = [
  {
    brand: "SUSURRI",
    all: ["Silent Bloom", "Amber Quiet", "Night Cedar"],
    launched: ["Silent Bloom", "Night Cedar"]
  },
  {
    brand: "Almost Human",
    all: ["Cinder Skin", "Soft Machine"],
    launched: ["Soft Machine"]
  },
  {
    brand: "Pineward Perfumes",
    all: ["Boreal Mist", "Forest Resin", "Moss Lantern"],
    launched: ["Moss Lantern"]
  },
  {
    brand: "CALAJ",
    all: ["Excluded Example"],
    launched: ["Excluded Example"]
  },
  {
    brand: "Grande Parfums",
    all: ["Velvet Marble", "Citrine Air"],
    launched: ["Citrine Air"]
  }
];

const workbook = new ExcelJS.Workbook();

for (const sheetData of workbookData) {
  const sheet = workbook.addWorksheet(sheetData.brand);
  sheet.getCell("A1").value = "ALL Perfumes";
  sheet.getCell("B1").value = "launched 2026";

  const maxRows = Math.max(sheetData.all.length, sheetData.launched.length);
  for (let index = 0; index < maxRows; index += 1) {
    sheet.getCell(`A${index + 2}`).value = sheetData.all[index] ?? "";
    sheet.getCell(`B${index + 2}`).value = sheetData.launched[index] ?? "";
  }
}

await fs.mkdir(outputDir, { recursive: true });
await workbook.xlsx.writeFile(outputFile);

console.log(`Demo workbook written to ${outputFile}`);
