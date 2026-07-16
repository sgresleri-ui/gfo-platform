import { Controller, Get } from '@nestjs/common';
import { InvestmentsService } from './investments.service';

@Controller('investments')
export class InvestmentsController {
  constructor(
    private readonly investmentsService: InvestmentsService,
  ) {}

  @Get()
  getPortfolio() {
    return this.investmentsService.getPortfolio();
  }
}
