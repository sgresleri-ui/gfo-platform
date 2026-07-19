import { Module } from '@nestjs/common';

import { BudgetModule } from '../budget/budget.module';
import { IpsModule } from '../ips/ips.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertiesModule } from '../properties/properties.module';
import { RiskModule } from '../risk/risk.module';

import { PlanningScenariosController } from './planning-scenarios.controller';
import { PlanningScenariosService } from './planning-scenarios.service';
import { PlanningScenarioStorageService } from './planning-scenario-storage.service';
import { PlanningScenarioAssessmentService } from './planning-scenario-assessment.service';

@Module({
  imports: [
    PrismaModule,
    BudgetModule,
    IpsModule,
    RiskModule,
    PropertiesModule,
  ],

  controllers: [
    PlanningScenariosController,
  ],

  providers: [
    PlanningScenariosService,
    PlanningScenarioStorageService,
    PlanningScenarioAssessmentService,
  ],

  exports: [
    PlanningScenariosService,
    PlanningScenarioStorageService,
    PlanningScenarioAssessmentService,
  ],
})
export class PlanningScenariosModule {}
