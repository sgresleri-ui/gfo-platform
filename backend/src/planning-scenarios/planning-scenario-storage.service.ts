import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  PlanningScenario,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  PlanningScenariosService,
  type SimulatePlanningScenarioInput,
} from './planning-scenarios.service';

import {
  buildEconomicProfileSnapshot,
  type CreateStoredPlanningScenarioInput,
  type StoredEconomicProfileSnapshot,
} from './planning-scenario-economic-profile';

@Injectable()
export class PlanningScenarioStorageService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly scenarioEngine:
      PlanningScenariosService,
  ) {}

  private numberOrNull(
    value: unknown,
  ): number | null {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    return (
      Math.round(
        (parsed + Number.EPSILON) *
          100,
      ) / 100
    );
  }

  private parseJson<T>(
    value: string | null,
  ): T | null {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private serializeScenario(
    scenario: PlanningScenario,
    includeResult = false,
  ) {
    const economicProfile =
      this.parseJson<
        StoredEconomicProfileSnapshot
      >(
        scenario
          .economicProfileSnapshotJson,
      );

    const base = {
      id: scenario.id,
      householdId:
        scenario.householdId,
      name: scenario.name,
      description:
        scenario.description,
      status: scenario.status,

      baseline: {
        workbook:
          scenario.baselineWorkbook,

        asOfDate:
          scenario.baselineAsOfDate,

        startYear:
          scenario.baselineStartYear,

        endYear:
          scenario.baselineEndYear,
      },

      sustainabilityStatus:
        scenario.sustainabilityStatus,

      initialCapital:
        this.numberOrNull(
          scenario.initialCapital,
        ),

      finalCapital:
        this.numberOrNull(
          scenario.finalCapital,
        ),

      minimumCapital:
        this.numberOrNull(
          scenario.minimumCapital,
        ),

      minimumCapitalYear:
        scenario.minimumCapitalYear,

      firstNegativeCapitalYear:
        scenario
          .firstNegativeCapitalYear,

      finalCapitalDelta:
        this.numberOrNull(
          scenario.finalCapitalDelta,
        ),

      finalCapitalDeltaPct:
        scenario.finalCapitalDeltaPct,

      lastSimulatedAt:
        scenario.lastSimulatedAt
          ?.toISOString() ?? null,

      createdAt:
        scenario.createdAt
          .toISOString(),

      updatedAt:
        scenario.updatedAt
          .toISOString(),

      assumptions:
        this.parseJson<
          SimulatePlanningScenarioInput
        >(
          scenario.assumptionsJson,
        ),

      economicProfile,
    };

    if (!includeResult) {
      return base;
    }

    return {
      ...base,

      lastResult:
        this.parseJson<unknown>(
          scenario.lastResultJson,
        ),
    };
  }

  private async getHouseholdId() {
    const household =
      await this.prisma
        .household.findFirst({
          orderBy: {
            id: 'asc',
          },
        });

    if (!household) {
      throw new NotFoundException(
        'Nucleo familiare non trovato.',
      );
    }

    return household.id;
  }

  private async findScenario(
    id: string,
  ) {
    const scenario =
      await this.prisma
        .planningScenario.findUnique({
          where: {
            id,
          },
        });

    if (!scenario) {
      throw new NotFoundException(
        'Scenario patrimoniale non trovato.',
      );
    }

    return scenario;
  }

  async createScenario(
    input:
      | CreateStoredPlanningScenarioInput
      | undefined,
  ) {
    const economicProfile =
      buildEconomicProfileSnapshot(
        input?.economicProfile,
      );

    const result =
      await this.scenarioEngine
        .simulateScenario(input);

    const householdId =
      await this.getHouseholdId();

    const scenario =
      await this.prisma
        .planningScenario.create({
          data: {
            householdId,

            name:
              result.scenario.name,

            description:
              result.scenario
                .description || null,

            assumptionsJson:
              JSON.stringify(
                result.scenario
                  .assumptions,
              ),

            economicProfileId:
              economicProfile?.profileId ??
              null,

            economicProfileCode:
              economicProfile?.code ??
              null,

            economicProfileName:
              economicProfile?.name ??
              null,

            economicProfileSnapshotJson:
              economicProfile
                ? JSON.stringify(
                    economicProfile,
                  )
                : null,

            lastResultJson:
              JSON.stringify(result),

            baselineWorkbook:
              result.baselineSource
                .workbook,

            baselineAsOfDate:
              result.baselineSource
                .asOfDate,

            baselineStartYear:
              result.baselineSource
                .startYear,

            baselineEndYear:
              result.baselineSource
                .endYear,

            sustainabilityStatus:
              result.summary.status,

            initialCapital:
              result.summary
                .initialCapital,

            finalCapital:
              result.summary
                .finalCapital,

            minimumCapital:
              result.summary
                .minimumCapital,

            minimumCapitalYear:
              result.summary
                .minimumCapitalYear,

            firstNegativeCapitalYear:
              result.summary
                .firstNegativeCapitalYear,

            finalCapitalDelta:
              result.comparison
                .finalCapitalDelta,

            finalCapitalDeltaPct:
              result.comparison
                .finalCapitalDeltaPct,

            lastSimulatedAt:
              new Date(
                result.generatedAt,
              ),
          },
        });

    return {
      created: true,

      scenario:
        this.serializeScenario(
          scenario,
          true,
        ),
    };
  }

  async getScenarios() {
    const scenarios =
      await this.prisma
        .planningScenario.findMany({
          where: {
            status: 'ACTIVE',
          },

          orderBy: [
            {
              updatedAt: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
        });

    return {
      generatedAt:
        new Date().toISOString(),

      count: scenarios.length,

      scenarios:
        scenarios.map(
          (scenario) =>
            this.serializeScenario(
              scenario,
            ),
        ),
    };
  }

  async getScenario(
    id: string,
  ) {
    const scenario =
      await this.findScenario(id);

    return this.serializeScenario(
      scenario,
      true,
    );
  }

  async rerunScenario(
    id: string,
  ) {
    const storedScenario =
      await this.findScenario(id);

    const assumptions =
      this.parseJson<
        SimulatePlanningScenarioInput
      >(
        storedScenario
          .assumptionsJson,
      );

    if (!assumptions) {
      throw new BadRequestException(
        'Le ipotesi dello scenario non sono leggibili.',
      );
    }

    const result =
      await this.scenarioEngine
        .simulateScenario(
          assumptions,
        );

    const updatedScenario =
      await this.prisma
        .planningScenario.update({
          where: {
            id,
          },

          data: {
            name:
              result.scenario.name,

            description:
              result.scenario
                .description || null,

            assumptionsJson:
              JSON.stringify(
                result.scenario
                  .assumptions,
              ),

            lastResultJson:
              JSON.stringify(result),

            baselineWorkbook:
              result.baselineSource
                .workbook,

            baselineAsOfDate:
              result.baselineSource
                .asOfDate,

            baselineStartYear:
              result.baselineSource
                .startYear,

            baselineEndYear:
              result.baselineSource
                .endYear,

            sustainabilityStatus:
              result.summary.status,

            initialCapital:
              result.summary
                .initialCapital,

            finalCapital:
              result.summary
                .finalCapital,

            minimumCapital:
              result.summary
                .minimumCapital,

            minimumCapitalYear:
              result.summary
                .minimumCapitalYear,

            firstNegativeCapitalYear:
              result.summary
                .firstNegativeCapitalYear,

            finalCapitalDelta:
              result.comparison
                .finalCapitalDelta,

            finalCapitalDeltaPct:
              result.comparison
                .finalCapitalDeltaPct,

            lastSimulatedAt:
              new Date(
                result.generatedAt,
              ),
          },
        });

    return {
      recalculated: true,

      scenario:
        this.serializeScenario(
          updatedScenario,
          true,
        ),
    };
  }

  async archiveScenario(
    id: string,
  ) {
    await this.findScenario(id);

    const scenario =
      await this.prisma
        .planningScenario.update({
          where: {
            id,
          },

          data: {
            status: 'ARCHIVED',
          },
        });

    return {
      archived: true,

      scenario:
        this.serializeScenario(
          scenario,
        ),
    };
  }
}
