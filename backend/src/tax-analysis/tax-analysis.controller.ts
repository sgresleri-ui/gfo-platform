import {
  Controller,
  Get,
} from '@nestjs/common';

import { TaxAnalysisService } from './tax-analysis.service';

@Controller('tax-analysis')
export class TaxAnalysisController {
  constructor(
    private readonly taxAnalysisService:
      TaxAnalysisService,
  ) {}

  @Get()
  getStatus() {
    return this.taxAnalysisService
      .getStatus();
  }

  @Get('el-toro')
  getElToroAnalysis() {
    return this.taxAnalysisService
      .getElToroAnalysis();
  }
}
