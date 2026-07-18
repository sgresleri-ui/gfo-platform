import {
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService:
      ReportsService,
  ) {}

  @Post('executive/snapshots')
  createExecutiveReportSnapshot() {
    return this.reportsService
      .createExecutiveReportSnapshot();
  }

  @Get('executive/snapshots')
  getExecutiveReportSnapshots() {
    return this.reportsService
      .getExecutiveReportSnapshots();
  }

  @Get('executive/snapshots/:id')
  getExecutiveReportSnapshot(
    @Param('id') id: string,
  ) {
    return this.reportsService
      .getExecutiveReportSnapshot(id);
  }

  @Get('executive')
  getExecutiveReport() {
    return this.reportsService
      .getExecutiveReport();
  }
}
