import { Module } from '@nestjs/common';

import { BudgetModule } from '../budget/budget.module';

import { PlanningScenariosController } from './planning-scenarios.controller';
import { PlanningScenariosService } from './planning-scenarios.service';

@Module({
  imports: [
    BudgetModule,
  ],
  controllers: [
    PlanningScenariosController,
  ],
  providers: [
    PlanningScenariosService,
  ],
  exports: [
    PlanningScenariosService,
  ],
})
export class PlanningScenariosModule {}
