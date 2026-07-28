import { Module } from '@nestjs/common';

import { CapitalAllocationModule } from '../capital-allocation/capital-allocation.module';
import { InvestmentsModule } from '../investments/investments.module';
import { IpsModule } from '../ips/ips.module';

import { InvestmentRecommendationsController } from './investment-recommendations.controller';
import { InvestmentRecommendationsService } from './investment-recommendations.service';

@Module({
  imports: [CapitalAllocationModule, IpsModule, InvestmentsModule],
  controllers: [InvestmentRecommendationsController],
  providers: [InvestmentRecommendationsService],
})
export class InvestmentRecommendationsModule {}
