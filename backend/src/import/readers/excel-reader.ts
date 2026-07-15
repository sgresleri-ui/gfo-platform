import * as ExcelJS from 'exceljs';

export class ExcelReader {

    async readWorkbook(path: string) {

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.readFile(path);

        return workbook;
    }

}
