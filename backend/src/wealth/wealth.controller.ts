import { Controller, Get } from '@nestjs/common';
import { WealthService } from './wealth.service';

@Controller()
export class DashboardController {
  constructor(private readonly wealthService: WealthService) {}

  @Get('dashboard')
  getDashboard() {
    return this.wealthService.getSummary();
  }
}

@Controller('wealth')
export class WealthController {
  constructor(private readonly wealthService: WealthService) {}

  @Get()
  getRegistry() {
    return this.wealthService.getRegistry();
  }

  @Get('summary')
  getSummary() {
    return this.wealthService.getSummary();
  }
}
