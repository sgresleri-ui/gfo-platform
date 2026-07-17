import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
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

  @Get('data-quality/corrections')
  getDataQualityCorrections() {
    return this.riskService
      .getDataQualityCorrections();
  }

  @Post('data-quality/positions/:id/country')
  updatePositionCountry(
    @Param('id', ParseIntPipe)
    id: number,

    @Body('country')
    country: string,

    @Body('confirm')
    confirm: boolean,

    @Body('reason')
    reason?: string,
  ) {
    return this.riskService
      .updatePositionCountry(
        id,
        country,
        confirm,
        reason,
      );
  }

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
