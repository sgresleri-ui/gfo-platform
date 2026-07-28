import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TaxAnalysisModule } from '../tax-analysis/tax-analysis.module';

import { CapitalAllocationController } from './capital-allocation.controller';
import { CapitalAllocationService } from './capital-allocation.service';

@Module({
  imports: [PrismaModule, TaxAnalysisModule],
  controllers: [CapitalAllocationController],
  providers: [CapitalAllocationService],
  exports: [CapitalAllocationService],
})
export class CapitalAllocationModule {}
