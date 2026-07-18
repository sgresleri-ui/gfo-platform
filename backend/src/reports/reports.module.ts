import { Module } from '@nestjs/common';

import { BudgetModule } from '../budget/budget.module';
import { DataCatalogModule } from '../data-catalog/data-catalog.module';
import { DocumentsModule } from '../documents/documents.module';
import { InvestmentsModule } from '../investments/investments.module';
import { LiquidityModule } from '../liquidity/liquidity.module';
import { OperationalCalendarModule } from '../operational-calendar/operational-calendar.module';
import { PerformanceModule } from '../performance/performance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertiesModule } from '../properties/properties.module';
import { RiskModule } from '../risk/risk.module';
import { WealthModule } from '../wealth/wealth.module';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    PrismaModule,
    WealthModule,
    InvestmentsModule,
    LiquidityModule,
    PropertiesModule,
    BudgetModule,
    PerformanceModule,
    RiskModule,
    OperationalCalendarModule,
    DocumentsModule,
    DataCatalogModule,
  ],
  controllers: [
    ReportsController,
  ],
  providers: [
    ReportsService,
  ],
})
export class ReportsModule {}
