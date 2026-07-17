import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import {
  PerformanceService,
} from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(
    private readonly performanceService:
      PerformanceService,
  ) {}

  @Get('periods')
  getAvailablePeriods() {
    return this.performanceService
      .getAvailablePeriods();
  }

  @Get('summary')
  getPerformanceSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.performanceService
      .getPerformanceSummary(
        from,
        to,
      );
  }
}
