import { Controller, Get } from '@nestjs/common';
import { LiquidityService } from './liquidity.service';

@Controller('liquidity')
export class LiquidityController {
  constructor(
    private readonly liquidityService: LiquidityService,
  ) {}

  @Get()
  getOverview() {
    return this.liquidityService.getOverview();
  }
}
