import { Controller, Get, Post } from '@nestjs/common';

import { InvestmentRecommendationsService } from './investment-recommendations.service';

@Controller('investment-recommendations')
export class InvestmentRecommendationsController {
  constructor(
    private readonly investmentRecommendationsService: InvestmentRecommendationsService,
  ) {}

  @Get('el-toro')
  getLatestElToroRecommendation() {
    return this.investmentRecommendationsService.getLatestElToroRecommendation();
  }

  @Post('el-toro/generate')
  generateElToroRecommendation() {
    return this.investmentRecommendationsService.generateElToroRecommendation();
  }
}
