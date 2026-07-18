import {
  createHash,
} from 'node:crypto';

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  ExecutiveReportSnapshot,
} from '@prisma/client';

import { BudgetService } from '../budget/budget.service';
import { DataCatalogService } from '../data-catalog/data-catalog.service';
import { DocumentsService } from '../documents/documents.service';
import { InvestmentsService } from '../investments/investments.service';
import { LiquidityService } from '../liquidity/liquidity.service';
import { OperationalCalendarService } from '../operational-calendar/operational-calendar.service';
import { PerformanceService } from '../performance/performance.service';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { RiskService } from '../risk/risk.service';
import { WealthService } from '../wealth/wealth.service';

type ReportSectionStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE';

type ReportSection<T> = {
  status: ReportSectionStatus;
  source: string;
  data: T | null;
  error: string | null;
};

type WealthSummarySnapshotData = {
  netWorth?: unknown;
  grossAssets?: unknown;
  liabilities?: unknown;
  liquidity?: unknown;
  investments?: unknown;
  realEstate?: unknown;
  otherAssets?: unknown;
  currency?: unknown;
};

type WealthRegistrySnapshotData = {
  household?: {
    id?: number;
    currency?: string;
  };
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly wealthService:
      WealthService,

    private readonly investmentsService:
      InvestmentsService,

    private readonly liquidityService:
      LiquidityService,

    private readonly propertiesService:
      PropertiesService,

    private readonly budgetService:
      BudgetService,

    private readonly performanceService:
      PerformanceService,

    private readonly riskService:
      RiskService,

    private readonly operationalCalendarService:
      OperationalCalendarService,

    private readonly documentsService:
      DocumentsService,

    private readonly dataCatalogService:
      DataCatalogService,

    private readonly prisma:
      PrismaService,
  ) {}

  private serializeError(
    reason: unknown,
  ): string {
    if (reason instanceof Error) {
      return reason.message;
    }

    if (typeof reason === 'string') {
      return reason;
    }

    return 'Sezione temporaneamente non disponibile.';
  }

  private createSection<T>(
    result: PromiseSettledResult<T>,
    source: string,
  ): ReportSection<T> {
    if (result.status === 'fulfilled') {
      return {
        status: 'AVAILABLE',
        source,
        data: result.value,
        error: null,
      };
    }

    return {
      status: 'UNAVAILABLE',
      source,
      data: null,
      error: this.serializeError(
        result.reason,
      ),
    };
  }

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

    return Number.isFinite(parsed)
      ? Math.round(
          (parsed + Number.EPSILON) *
            100,
        ) / 100
      : null;
  }

  private serializeSnapshot(
    snapshot: ExecutiveReportSnapshot,
    includePayload = false,
  ) {
    const base = {
      id: snapshot.id,
      householdId: snapshot.householdId,
      reportType: snapshot.reportType,
      version: snapshot.version,
      status: snapshot.status,

      generatedAt:
        snapshot.generatedAt.toISOString(),

      completenessPercentage:
        snapshot.completenessPercentage,

      totalSections:
        snapshot.totalSections,

      availableSections:
        snapshot.availableSections,

      unavailableSections:
        snapshot.unavailableSections,

      netWorth:
        this.numberOrNull(
          snapshot.netWorth,
        ),

      grossAssets:
        this.numberOrNull(
          snapshot.grossAssets,
        ),

      liabilities:
        this.numberOrNull(
          snapshot.liabilities,
        ),

      liquidity:
        this.numberOrNull(
          snapshot.liquidity,
        ),

      investments:
        this.numberOrNull(
          snapshot.investments,
        ),

      realEstate:
        this.numberOrNull(
          snapshot.realEstate,
        ),

      otherAssets:
        this.numberOrNull(
          snapshot.otherAssets,
        ),

      currency: snapshot.currency,
      checksum: snapshot.checksum,
      source: snapshot.source,

      createdAt:
        snapshot.createdAt.toISOString(),
    };

    if (!includePayload) {
      return base;
    }

    let payload: unknown = null;

    try {
      payload = JSON.parse(
        snapshot.payloadJson,
      ) as unknown;
    } catch {
      payload = null;
    }

    const recalculatedChecksum =
      createHash('sha256')
        .update(snapshot.payloadJson)
        .digest('hex');

    return {
      ...base,
      checksumVerified:
        recalculatedChecksum ===
        snapshot.checksum,
      payload,
    };
  }

  async getExecutiveReport() {
    const results =
      await Promise.allSettled([
        this.wealthService.getSummary(),
        this.wealthService.getRegistry(),

        this.investmentsService
          .getPortfolio(),

        this.liquidityService
          .getOverview(),

        this.propertiesService
          .getOverview(),

        this.budgetService
          .getOverview(),

        this.performanceService
          .getPerformanceSummary(
            undefined,
            undefined,
          ),

        this.riskService
          .getOverview(),

        this.riskService
          .getDataQuality(),

        this.operationalCalendarService
          .getOverview(),

        this.documentsService
          .getOverview(),

        this.dataCatalogService
          .getOverview(),
      ]);

    const [
      wealthSummaryResult,
      wealthRegistryResult,
      investmentsResult,
      liquidityResult,
      propertiesResult,
      budgetResult,
      performanceResult,
      riskResult,
      riskDataQualityResult,
      operationalCalendarResult,
      documentsResult,
      dataCatalogResult,
    ] = results;

    const sections = {
      wealthSummary: this.createSection(
        wealthSummaryResult,
        'WealthService.getSummary',
      ),

      wealthRegistry: this.createSection(
        wealthRegistryResult,
        'WealthService.getRegistry',
      ),

      investments: this.createSection(
        investmentsResult,
        'InvestmentsService.getPortfolio',
      ),

      liquidity: this.createSection(
        liquidityResult,
        'LiquidityService.getOverview',
      ),

      properties: this.createSection(
        propertiesResult,
        'PropertiesService.getOverview',
      ),

      budget: this.createSection(
        budgetResult,
        'BudgetService.getOverview',
      ),

      performance: this.createSection(
        performanceResult,
        'PerformanceService.getPerformanceSummary',
      ),

      risk: this.createSection(
        riskResult,
        'RiskService.getOverview',
      ),

      dataQuality: this.createSection(
        riskDataQualityResult,
        'RiskService.getDataQuality',
      ),

      operationalCalendar:
        this.createSection(
          operationalCalendarResult,
          'OperationalCalendarService.getOverview',
        ),

      documents: this.createSection(
        documentsResult,
        'DocumentsService.getOverview',
      ),

      dataCatalog: this.createSection(
        dataCatalogResult,
        'DataCatalogService.getOverview',
      ),
    };

    const unavailableSections =
      Object.entries(sections)
        .filter(
          ([, section]) =>
            section.status ===
            'UNAVAILABLE',
        )
        .map(([name]) => name);

    const availableSections =
      Object.keys(sections).filter(
        (name) =>
          !unavailableSections.includes(
            name,
          ),
      );

    return {
      generatedAt:
        new Date().toISOString(),

      reportType:
        'FAMILY_OFFICE_EXECUTIVE',

      version: '1.0',

      status:
        unavailableSections.length === 0
          ? 'COMPLETE'
          : 'PARTIAL',

      completeness: {
        totalSections:
          Object.keys(sections).length,

        availableSections:
          availableSections.length,

        unavailableSections:
          unavailableSections.length,

        percentage:
          Math.round(
            (
              availableSections.length /
              Object.keys(sections).length
            ) * 10000,
          ) / 100,
      },

      unavailableSectionNames:
        unavailableSections,

      sections,
    };
  }

  async createExecutiveReportSnapshot() {
    const report =
      await this.getExecutiveReport();

    const wealthSummary =
      report.sections.wealthSummary
        .data as
        | WealthSummarySnapshotData
        | null;

    const wealthRegistry =
      report.sections.wealthRegistry
        .data as
        | WealthRegistrySnapshotData
        | null;

    let householdId =
      wealthRegistry?.household?.id;

    if (
      householdId === undefined ||
      !Number.isInteger(householdId)
    ) {
      const household =
        await this.prisma.household.findFirst(
          {
            orderBy: {
              id: 'asc',
            },
          },
        );

      if (!household) {
        throw new NotFoundException(
          'Nucleo familiare non trovato.',
        );
      }

      householdId = household.id;
    }

    const netWorth =
      this.numberOrNull(
        wealthSummary?.netWorth,
      );

    const liabilities =
      this.numberOrNull(
        wealthSummary?.liabilities,
      );

    const liquidity =
      this.numberOrNull(
        wealthSummary?.liquidity,
      );

    const investments =
      this.numberOrNull(
        wealthSummary?.investments,
      );

    const realEstate =
      this.numberOrNull(
        wealthSummary?.realEstate,
      );

    const otherAssets =
      this.numberOrNull(
        wealthSummary?.otherAssets,
      );

    const grossAssetsFromSummary =
      this.numberOrNull(
        wealthSummary?.grossAssets,
      );

    const assetValues = [
      liquidity,
      investments,
      realEstate,
      otherAssets,
    ].filter(
      (value): value is number =>
        value !== null,
    );

    const grossAssets =
      grossAssetsFromSummary ??
      (
        assetValues.length > 0
          ? assetValues.reduce(
              (total, value) =>
                total + value,
              0,
            )
          : null
      );

    const currency =
      typeof wealthSummary?.currency ===
      'string'
        ? wealthSummary.currency
        : wealthRegistry?.household
              ?.currency ??
          'EUR';

    const payloadJson =
      JSON.stringify(report);

    const checksum =
      createHash('sha256')
        .update(payloadJson)
        .digest('hex');

    const existing =
      await this.prisma
        .executiveReportSnapshot
        .findUnique({
          where: {
            checksum,
          },
        });

    if (existing) {
      return {
        created: false,
        duplicate: true,
        snapshot:
          this.serializeSnapshot(
            existing,
          ),
      };
    }

    const snapshot =
      await this.prisma
        .executiveReportSnapshot
        .create({
          data: {
            householdId,
            reportType:
              report.reportType,
            version:
              report.version,
            status:
              report.status,

            generatedAt:
              new Date(
                report.generatedAt,
              ),

            completenessPercentage:
              report.completeness
                .percentage,

            totalSections:
              report.completeness
                .totalSections,

            availableSections:
              report.completeness
                .availableSections,

            unavailableSections:
              report.completeness
                .unavailableSections,

            netWorth,
            grossAssets,
            liabilities,
            liquidity,
            investments,
            realEstate,
            otherAssets,
            currency,
            payloadJson,
            checksum,
          },
        });

    return {
      created: true,
      duplicate: false,
      snapshot:
        this.serializeSnapshot(
          snapshot,
        ),
    };
  }

  async getExecutiveReportSnapshots() {
    const snapshots =
      await this.prisma
        .executiveReportSnapshot
        .findMany({
          orderBy: [
            {
              generatedAt: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],

          take: 100,
        });

    return {
      generatedAt:
        new Date().toISOString(),

      count: snapshots.length,

      snapshots:
        snapshots.map((snapshot) =>
          this.serializeSnapshot(
            snapshot,
          ),
        ),
    };
  }

  async getExecutiveReportSnapshot(
    id: string,
  ) {
    const snapshot =
      await this.prisma
        .executiveReportSnapshot
        .findUnique({
          where: {
            id,
          },
        });

    if (!snapshot) {
      throw new NotFoundException(
        'Snapshot del report non trovato.',
      );
    }

    return this.serializeSnapshot(
      snapshot,
      true,
    );
  }
}
