import { Controller, Post } from '@nestjs/common';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  async importWorkbook() {
    return this.importService.importWorkbook();
  }
}