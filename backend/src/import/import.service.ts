import { Injectable } from '@nestjs/common';
import { ExcelReader } from './readers/excel-reader';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImportService {

  async importWorkbook() {

    const workbookPath = path.join(
      process.cwd(),
      '..',
      'data',
      'Gresleri2026.xlsm'
    );

    if (!fs.existsSync(workbookPath)) {
      return {
        success: false,
        message: 'Workbook non trovato',
        path: workbookPath
      };
    }

    const reader = new ExcelReader();

    const workbook = await reader.readWorkbook(workbookPath);

    const worksheets = workbook.worksheets.map((ws, index) => {

      return {

        index: index + 1,

        name: ws.name,

        rows: ws.rowCount,

        columns: ws.columnCount,

        cells: ws.rowCount * ws.columnCount,

        status: "OK"

      };

    });

    return {

      success: true,

      workbook: path.basename(workbookPath),

      sheetCount: worksheets.length,

      worksheets

    };

  }

}