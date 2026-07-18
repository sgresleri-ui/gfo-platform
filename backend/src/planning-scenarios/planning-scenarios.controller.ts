import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import {
  PlanningScenariosService,
  type SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

@Controller('planning/scenarios')
export class PlanningScenariosController {
  constructor(
    private readonly planningScenariosService:
      PlanningScenariosService,
  ) {}

  @Get('baseline')
  getBaseline() {
    return this.planningScenariosService
      .getBaseline();
  }

  @Post('simulate')
  simulateScenario(
    @Body()
    input: SimulatePlanningScenarioInput,
  ) {
    return this.planningScenariosService
      .simulateScenario(input);
  }
}
