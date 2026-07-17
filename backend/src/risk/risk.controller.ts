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

  @Get('overview')
  getOverview() {
    return this.riskService
      .getOverview();
  }
}
