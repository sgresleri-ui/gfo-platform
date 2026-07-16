import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { ImportComparisonService } from './import-comparison.service';
import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService:
      ImportsService,

    private readonly comparisonService:
      ImportComparisonService,
  ) {}

  @Get()
  getHistory() {
    return this.importsService.getHistory();
  }

  @Get('status')
  getStatus() {
    return this.importsService.getStatus();
  }

  @Post('preview')
  createPreview() {
    return this.importsService.createPreview();
  }

  @Post('compare')
  compareWorkbook() {
    return this.comparisonService.compareWorkbook();
  }
}
