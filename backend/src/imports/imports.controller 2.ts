import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { ImportApplicationService } from './import-application.service';
import { ImportComparisonService } from './import-comparison.service';
import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService:
      ImportsService,

    private readonly comparisonService:
      ImportComparisonService,

    private readonly applicationService:
      ImportApplicationService,
  ) {}

  @Get()
  getHistory() {
    return this.importsService.getHistory();
  }

  @Get('status')
  getStatus() {
    return this.importsService.getStatus();
  }

  @Get('snapshots')
  getSnapshots() {
    return this.applicationService.getSnapshots();
  }

  @Post('preview')
  createPreview() {
    return this.importsService.createPreview();
  }

  @Post('compare')
  compareWorkbook() {
    return this.comparisonService.compareWorkbook();
  }

  @Post('apply')
  applyImport(
    @Body('confirm') confirm: boolean,
  ) {
    return this.applicationService.applyImport(
      confirm,
    );
  }

  @Post(':runId/rollback')
  rollbackImport(
    @Param('runId') runId: string,
    @Body('confirm') confirm: boolean,
  ) {
    return this.applicationService.rollbackImport(
      runId,
      confirm,
    );
  }
}
