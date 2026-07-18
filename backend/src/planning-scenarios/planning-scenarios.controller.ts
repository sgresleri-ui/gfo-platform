import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import {
  PlanningScenariosService,
  type SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

import {
  PlanningScenarioStorageService,
} from './planning-scenario-storage.service';

@Controller('planning/scenarios')
export class PlanningScenariosController {
  constructor(
    private readonly planningScenariosService:
      PlanningScenariosService,

    private readonly storageService:
      PlanningScenarioStorageService,
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

  @Get()
  getScenarios() {
    return this.storageService
      .getScenarios();
  }

  @Post()
  createScenario(
    @Body()
    input: SimulatePlanningScenarioInput,
  ) {
    return this.storageService
      .createScenario(input);
  }

  @Get(':id')
  getScenario(
    @Param('id') id: string,
  ) {
    return this.storageService
      .getScenario(id);
  }

  @Post(':id/simulate')
  rerunScenario(
    @Param('id') id: string,
  ) {
    return this.storageService
      .rerunScenario(id);
  }

  @Post(':id/archive')
  archiveScenario(
    @Param('id') id: string,
  ) {
    return this.storageService
      .archiveScenario(id);
  }
}
