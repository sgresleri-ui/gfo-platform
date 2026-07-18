import { Injectable } from '@nestjs/common';

import { BudgetService } from '../budget/budget.service';
import { DataCatalogService } from '../data-catalog/data-catalog.service';
import { DocumentsService } from '../documents/documents.service';
import { InvestmentsService } from '../investments/investments.service';
import { LiquidityService } from '../liquidity/liquidity.service';
import { OperationalCalendarService } from '../operational-calendar/operational-calendar.service';
import { PerformanceService } from '../performance/performance.service';
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
}
