import { Body, Controller, Get, Post, Put } from '@nestjs/common';

import {
  InvestmentRecommendationsService,
  type UpdateElToroEntryPlanInput,
} from './investment-recommendations.service';

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

  @Get('el-toro/plan')
  getElToroEntryPlan() {
    return this.investmentRecommendationsService.getElToroEntryPlan();
  }

  @Put('el-toro/plan')
  updateElToroEntryPlan(
    @Body()
    input: UpdateElToroEntryPlanInput,
  ) {
    return this.investmentRecommendationsService.updateElToroEntryPlan(input);
  }
}
