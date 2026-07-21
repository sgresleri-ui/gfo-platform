import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  PlanningScenariosService,
  type SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

import { PlanningScenarioStorageService } from './planning-scenario-storage.service';

import type {
  CreateStoredPlanningScenarioInput,
  UpdateStoredPlanningScenarioInput,
} from './planning-scenario-economic-profile';

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

  @Post('assess-allocation/compare-optimized')
  compareOptimizedRebalancingStrategies(
    @Body()
    body: {
      input?:
        SimulatePlanningAllocationInput;
    },
  ) {
    return this.assessmentService
      .compareOptimizedRebalancingStrategies(
        body.input,
      );
  }

  @Post('assess-allocation/auto-remediate')
  buildAutomaticRebalancingPlan(
    @Body()
    body: {
      input?:
        SimulatePlanningAllocationInput;

      maxIterations?:
        number;
    },
  ) {
    return this.assessmentService
      .buildAutomaticRebalancingPlan(
        body.input,

        body.maxIterations,
      );
  }

  @Post('assess-allocation')
  assessAllocationScenario(
    @Body()
    input:
      SimulatePlanningAllocationInput,
  ) {
    return this.assessmentService
      .assessAllocationScenario(
        input,
      );
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
  getScenarios(
    @Query('includeArchived')
    includeArchived?: string,
  ) {
    return this.storageService
      .getScenarios(
        includeArchived === 'true',
      );
  }

  @Post()
  createScenario(
    @Body()
    input:
      CreateStoredPlanningScenarioInput,
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

  @Patch(':id')
  updateScenario(
    @Param('id') id: string,

    @Body()
    input:
      UpdateStoredPlanningScenarioInput,
  ) {
    return this.storageService
      .updateScenario(id, input);
  }

  @Post(':id/simulate')
  rerunScenario(
    @Param('id') id: string,
  ) {
    return this.storageService
      .rerunScenario(id);
  }

  @Post(':id/duplicate')
  duplicateScenario(
    @Param('id') id: string,
  ) {
    return this.storageService
      .duplicateScenario(id);
  }

  @Post(':id/archive')
  archiveScenario(
    @Param('id') id: string,
  ) {
    return this.storageService
      .archiveScenario(id);
  }

  @Post(':id/restore')
  restoreScenario(
    @Param('id') id: string,
  ) {
    return this.storageService
      .restoreScenario(id);
  }
}
