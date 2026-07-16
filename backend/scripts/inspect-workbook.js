const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const workbookPath = path.resolve(
  __dirname,
  "../../data/Gresleri2026.xlsm"
);

const outputPath = path.resolve(
  __dirname,
  "../workbook-inspection.json"
);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function plainValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("");
    }

    if ("result" in value) {
      return plainValue(value.result);
    }

    if ("text" in value) {
      return value.text;
    }

    return JSON.stringify(value);
  }

  return value;
}

function inspectCell(sheet, address) {
  if (!sheet) {
    return {
      address,
      error: "Foglio non trovato",
    };
  }

  const cell = sheet.getCell(address);
  const raw = cell.value;

  return {
    address,
    type: cell.type,
    text: cell.text || "",
    value: plainValue(raw),
    formula:
      raw &&
      typeof raw === "object" &&
      "formula" in raw
        ? raw.formula
        : null,
    formulaResult:
      raw &&
      typeof raw === "object" &&
      "result" in raw
        ? plainValue(raw.result)
        : null,
  };
}

function findSheet(workbook, candidates) {
  const normalizedCandidates = candidates.map(normalize);

  return workbook.worksheets.find((sheet) => {
    const sheetName = normalize(sheet.name);

    return normalizedCandidates.some(
      (candidate) =>
        sheetName === candidate ||
        sheetName.includes(candidate) ||
        candidate.includes(sheetName)
    );
  });
}

function previewRows(sheet, maxRows = 20, maxColumns = 18) {
  if (!sheet) {
    return [];
  }

  const result = [];

  for (
    let rowNumber = 1;
    rowNumber <= Math.min(sheet.rowCount, maxRows);
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber);
    const cells = [];

    for (
      let columnNumber = 1;
      columnNumber <= maxColumns;
      columnNumber += 1
    ) {
      const cell = row.getCell(columnNumber);
      const text = cell.text?.trim();

      if (text) {
        cells.push({
          address: cell.address,
          text,
        });
      }
    }

    if (cells.length > 0) {
      result.push({
        row: rowNumber,
        cells,
      });
    }
  }

  return result;
}

function findPortfolioTable(sheet) {
  if (!sheet) {
    return {
      error: "Foglio Portafoglio non trovato",
    };
  }

  const aliases = {
    portfolio: ["portafoglio", "portfolio"],
    title: ["titolo", "nome strumento", "descrizione"],
    instrument: ["strumento", "tipo strumento"],
    isin: ["isin"],
    market: ["mercato"],
    currency: ["valuta", "currency"],
    quantity: ["quantita", "quantità"],
    marketPrice: [
      "p.zo di mercato",
      "prezzo di mercato",
      "prezzo mercato",
    ],
    marketValue: [
      "valore di mercato €",
      "valore di mercato",
      "valore mercato €",
      "valore mercato",
    ],
  };

  let bestHeader = null;

  for (
    let rowNumber = 1;
    rowNumber <= Math.min(sheet.rowCount, 40);
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber);
    const columns = {};
    let score = 0;

    for (
      let columnNumber = 1;
      columnNumber <= Math.min(sheet.columnCount, 40);
      columnNumber += 1
    ) {
      const text = normalize(row.getCell(columnNumber).text);

      if (!text) {
        continue;
      }

      for (const [field, fieldAliases] of Object.entries(aliases)) {
        const match = fieldAliases.some((alias) => {
          const normalizedAlias = normalize(alias);

          return (
            text === normalizedAlias ||
            text.includes(normalizedAlias)
          );
        });

        if (match && !columns[field]) {
          columns[field] = columnNumber;
          score += 1;
        }
      }
    }

    if (!bestHeader || score > bestHeader.score) {
      bestHeader = {
        row: rowNumber,
        score,
        columns,
      };
    }
  }

  if (!bestHeader || bestHeader.score < 2) {
    return {
      error: "Intestazione Portafoglio non identificata",
      bestCandidate: bestHeader,
      preview: previewRows(sheet, 25, 25),
    };
  }

  const records = [];

  for (
    let rowNumber = bestHeader.row + 1;
    rowNumber <= sheet.rowCount;
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber);

    const record = {
      sourceRow: rowNumber,
    };

    for (const [field, columnNumber] of Object.entries(
      bestHeader.columns
    )) {
      record[field] = plainValue(
        row.getCell(columnNumber).value
      );
    }

    const hasUsefulData = [
      record.portfolio,
      record.title,
      record.instrument,
      record.isin,
      record.marketValue,
    ].some(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );

    if (hasUsefulData) {
      records.push(record);
    }

    if (records.length >= 100) {
      break;
    }
  }

  return {
    sheet: sheet.name,
    rowCount: sheet.rowCount,
    columnCount: sheet.columnCount,
    header: bestHeader,
    records,
  };
}

async function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(
      `Workbook non trovato: ${workbookPath}`
    );
  }

  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(workbookPath);

  const contoEconomico = findSheet(workbook, [
    "Conto Economico",
    "Conto Econ",
  ]);

  const portafoglio = findSheet(workbook, [
    "Portafoglio",
  ]);

  const riccione = findSheet(workbook, [
    "Riccione",
  ]);

  const dubai = findSheet(workbook, [
    "Dubai",
  ]);

  const immobili = findSheet(workbook, [
    "Immobili",
    "Properties",
    "Proprieta",
  ]);

  const result = {
    generatedAt: new Date().toISOString(),
    workbookPath,
    workbook: path.basename(workbookPath),

    sheets: workbook.worksheets.map((sheet, index) => ({
      index: index + 1,
      name: sheet.name,
      rows: sheet.rowCount,
      columns: sheet.columnCount,
    })),

    identifiedSheets: {
      contoEconomico: contoEconomico?.name ?? null,
      portafoglio: portafoglio?.name ?? null,
      riccione: riccione?.name ?? null,
      dubai: dubai?.name ?? null,
      immobili: immobili?.name ?? null,
    },

    directCells: {
      contoEconomico: {
        sheet: contoEconomico?.name ?? null,
        insuranceProduct: inspectCell(
          contoEconomico,
          "O17"
        ),
        accounts: {
          IBKR: inspectCell(contoEconomico, "P23"),
          RAKBANK_EUR: inspectCell(
            contoEconomico,
            "P28"
          ),
          RAKBANK_AED: inspectCell(
            contoEconomico,
            "P33"
          ),
          FINECO_ST: inspectCell(
            contoEconomico,
            "P38"
          ),
          FINECO_SA: inspectCell(
            contoEconomico,
            "P43"
          ),
          BBVA: inspectCell(contoEconomico, "P48"),
          REVOLUT: inspectCell(
            contoEconomico,
            "P53"
          ),
        },
      },

      riccione: {
        sheet: riccione?.name ?? null,
        residualDebt: inspectCell(riccione, "F4"),
      },

      dubai: {
        sheet: dubai?.name ?? null,
        residualDebt: inspectCell(dubai, "B8"),
      },
    },

    portfolioTable: findPortfolioTable(portafoglio),

    propertyPreviews: {
      immobili: previewRows(immobili, 30, 18),
      riccione: previewRows(riccione, 20, 14),
      dubai: previewRows(dubai, 20, 14),
    },
  };

  fs.writeFileSync(
    outputPath,
    JSON.stringify(result, null, 2),
    "utf8"
  );

  console.log(`Analisi completata.`);
  console.log(`File creato: ${outputPath}`);
  console.log(
    `Fogli trovati: ${workbook.worksheets.length}`
  );
  console.log(
    `Posizioni Portafoglio rilevate: ${
      result.portfolioTable.records?.length ?? 0
    }`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
