import { Controller, Post } from '@nestjs/common';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
  ) {}

  @Post()
  importWorkbook() {
    return this.importService.importWorkbook();
  }

  @Post('wealth/preview')
  previewWealthImport() {
    return this.importService.previewWealthImport();
  }

  @Post('wealth')
  importWealth() {
    return this.importService.importWealth();
  }
}
