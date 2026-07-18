import { Module } from '@nestjs/common';

import { BudgetModule } from '../budget/budget.module';
import { PrismaModule } from '../prisma/prisma.module';

import { PlanningScenariosController } from './planning-scenarios.controller';
import { PlanningScenariosService } from './planning-scenarios.service';
import { PlanningScenarioStorageService } from './planning-scenario-storage.service';

@Module({
  imports: [
    PrismaModule,
    BudgetModule,
  ],

  controllers: [
    PlanningScenariosController,
  ],

  providers: [
    PlanningScenariosService,
    PlanningScenarioStorageService,
  ],

  exports: [
    PlanningScenariosService,
    PlanningScenarioStorageService,
  ],
})
export class PlanningScenariosModule {}
