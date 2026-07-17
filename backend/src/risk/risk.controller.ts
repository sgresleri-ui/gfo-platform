import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  RiskService,
} from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(
    private readonly riskService:
      RiskService,
  ) {}

  @Get('data-quality')
  getDataQuality() {
    return this.riskService
      .getDataQuality();
  }

  @Get('overview')
  getOverview() {
    return this.riskService
      .getOverview();
  }
}
