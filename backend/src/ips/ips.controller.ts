import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import {
  IpsService,
} from './ips.service';

@Controller('ips')
export class IpsController {
  constructor(
    private readonly ipsService:
      IpsService,
  ) {}

  @Get('metrics')
  getSupportedMetrics() {
    return this.ipsService
      .getSupportedMetrics();
  }

  @Get('limits')
  getLimits() {
    return this.ipsService
      .getLimits();
  }

  @Get('compliance')
  getCompliance() {
    return this.ipsService
      .getCompliance();
  }

  @Post('limits/:code')
  updateLimit(
    @Param('code')
    code: string,

    @Body()
    body: {
      minimum?: number | null;
      maximum?: number | null;
      target?: number | null;
      enabled?: boolean;
      rationale?: string | null;
      confirm?: boolean;
    },
  ) {
    return this.ipsService
      .updateLimit(
        code,
        body,
      );
  }
}
