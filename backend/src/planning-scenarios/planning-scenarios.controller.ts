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

import { PlanningScenarioStorageService } from './planning-scenario-storage.service';
import { PlanningScenarioAssessmentService } from './planning-scenario-assessment.service';

import {
  PlanningAllocationService,
  type SimulatePlanningAllocationInput,
} from './planning-allocation.service';

@Controller('planning/scenarios')
export class PlanningScenariosController {
  constructor(
    private readonly planningScenariosService:
      PlanningScenariosService,

    private readonly storageService:
      PlanningScenarioStorageService,

    private readonly assessmentService:
      PlanningScenarioAssessmentService,

    private readonly allocationService:
      PlanningAllocationService,
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

  @Post('assess')
  assessScenario(
    @Body()
    input: SimulatePlanningScenarioInput,
  ) {
    return this.assessmentService
      .assessScenario(input);
  }

  @Post('allocation')
  simulateAllocation(
    @Body()
    input:
      SimulatePlanningAllocationInput,
  ) {
    return this.allocationService
      .simulateAllocation(input);
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
