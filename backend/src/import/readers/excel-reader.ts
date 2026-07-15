import * as XLSX from "xlsx";

export class ExcelReader {
  private workbook: XLSX.WorkBook;

  constructor(filePath: string) {
    this.workbook = XLSX.readFile(filePath);
  }

  public getValue(sheetName: string, cell: string): any {
    const sheet = this.workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" non trovato.`);
    }

    const value = sheet[cell];

    return value ? value.v : null;
  }
}
