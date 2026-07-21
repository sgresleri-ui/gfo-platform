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
  type UpdateStoredPlanningScenarioInput,
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

  async getScenarios(
    includeArchived = false,
  ) {
    const scenarios =
      await this.prisma
        .planningScenario.findMany({
          where: includeArchived
            ? undefined
            : {
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

  async updateScenario(
    id: string,

    input:
      UpdateStoredPlanningScenarioInput,
  ) {
    const current =
      await this.findScenario(id);

    const assumptions =
      this.parseJson<
        SimulatePlanningScenarioInput
      >(
        current.assumptionsJson,
      );

    if (!assumptions) {
      throw new BadRequestException(
        'Le ipotesi dello scenario non sono leggibili.',
      );
    }

    const name =
      input.name === undefined
        ? current.name
        : String(
            input.name ?? '',
          ).trim();

    if (!name) {
      throw new BadRequestException(
        'Il nome dello scenario è obbligatorio.',
      );
    }

    if (name.length > 160) {
      throw new BadRequestException(
        'Il nome dello scenario non può superare 160 caratteri.',
      );
    }

    const description =
      input.description === undefined
        ? current.description
        : String(
            input.description ?? '',
          ).trim() || null;

    if (
      description &&
      description.length > 2000
    ) {
      throw new BadRequestException(
        'La descrizione non può superare 2000 caratteri.',
      );
    }

    const updatedAssumptions:
      SimulatePlanningScenarioInput = {
        ...assumptions,
        name,
        description:
          description ?? '',
      };

    const storedResult =
      this.parseJson<{
        scenario?: {
          name?: string;
          description?: string;
          assumptions?:
            SimulatePlanningScenarioInput;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }>(
        current.lastResultJson,
      );

    const updatedResult =
      storedResult?.scenario
        ? {
            ...storedResult,

            scenario: {
              ...storedResult.scenario,
              name,
              description:
                description ?? '',
              assumptions:
                updatedAssumptions,
            },
          }
        : storedResult;

    const scenario =
      await this.prisma
        .planningScenario.update({
          where: {
            id,
          },

          data: {
            name,
            description,

            assumptionsJson:
              JSON.stringify(
                updatedAssumptions,
              ),

            lastResultJson:
              updatedResult
                ? JSON.stringify(
                    updatedResult,
                  )
                : current
                    .lastResultJson,
          },
        });

    return {
      updated: true,

      scenario:
        this.serializeScenario(
          scenario,
          true,
        ),
    };
  }

  async duplicateScenario(
    id: string,
  ) {
    const current =
      await this.findScenario(id);

    const assumptions =
      this.parseJson<
        SimulatePlanningScenarioInput
      >(
        current.assumptionsJson,
      );

    if (!assumptions) {
      throw new BadRequestException(
        'Le ipotesi dello scenario non sono leggibili.',
      );
    }

    const copyName =
      `Copia di ${current.name}`
        .slice(0, 160);

    const duplicatedAssumptions:
      SimulatePlanningScenarioInput = {
        ...assumptions,
        name: copyName,
      };

    const storedResult =
      this.parseJson<{
        scenario?: {
          name?: string;
          assumptions?:
            SimulatePlanningScenarioInput;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }>(
        current.lastResultJson,
      );

    const duplicatedResult =
      storedResult?.scenario
        ? {
            ...storedResult,

            scenario: {
              ...storedResult.scenario,
              name: copyName,
              assumptions:
                duplicatedAssumptions,
            },
          }
        : storedResult;

    const scenario =
      await this.prisma
        .planningScenario.create({
          data: {
            householdId:
              current.householdId,

            name:
              copyName,

            description:
              current.description,

            status:
              'ACTIVE',

            assumptionsJson:
              JSON.stringify(
                duplicatedAssumptions,
              ),

            economicProfileId:
              current.economicProfileId,

            economicProfileCode:
              current.economicProfileCode,

            economicProfileName:
              current.economicProfileName,

            economicProfileSnapshotJson:
              current
                .economicProfileSnapshotJson,

            lastResultJson:
              duplicatedResult
                ? JSON.stringify(
                    duplicatedResult,
                  )
                : current
                    .lastResultJson,

            baselineWorkbook:
              current.baselineWorkbook,

            baselineAsOfDate:
              current.baselineAsOfDate,

            baselineStartYear:
              current.baselineStartYear,

            baselineEndYear:
              current.baselineEndYear,

            sustainabilityStatus:
              current
                .sustainabilityStatus,

            initialCapital:
              current.initialCapital,

            finalCapital:
              current.finalCapital,

            minimumCapital:
              current.minimumCapital,

            minimumCapitalYear:
              current
                .minimumCapitalYear,

            firstNegativeCapitalYear:
              current
                .firstNegativeCapitalYear,

            finalCapitalDelta:
              current.finalCapitalDelta,

            finalCapitalDeltaPct:
              current
                .finalCapitalDeltaPct,

            lastSimulatedAt:
              current.lastSimulatedAt,
          },
        });

    return {
      duplicated: true,

      scenario:
        this.serializeScenario(
          scenario,
          true,
        ),
    };
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

  async restoreScenario(
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
            status: 'ACTIVE',
          },
        });

    return {
      restored: true,

      scenario:
        this.serializeScenario(
          scenario,
        ),
    };
  }
}
