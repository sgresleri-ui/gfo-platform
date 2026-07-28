import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { TaxAnalysisService } from '../tax-analysis/tax-analysis.service';

const EL_TORO_PROPERTY_CODE = 'PROPERTY_EL_TORO';

const DOCUMENTED_PLAN = {
  dubaiHomeReserve: 1_070_000,
  familyTransitionReserve: 230_000,
  longTermCoreInvestment: 500_000,
};

export type UpdateElToroCapitalPlanInput = {
  dubaiHomeReserve?: number;
  familyTransitionReserve?: number;
  longTermCoreInvestment?: number;
};

type ElToroTaxAnalysis = Awaited<
  ReturnType<TaxAnalysisService['getElToroAnalysis']>
>;

type StoredCapitalPlan = Awaited<
  ReturnType<PrismaService['capitalAllocationPlan']['upsert']>
>;

@Injectable()
export class CapitalAllocationService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly taxAnalysisService: TaxAnalysisService,
  ) {}

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private validateAmount(
    value: number | undefined,
    fallback: number,
    label: string,
  ): number {
    if (value === undefined) {
      return fallback;
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `${label} deve essere un importo valido maggiore o uguale a zero.`,
      );
    }

    return this.roundMoney(value);
  }

  private getStoredPlan() {
    return this.prisma.capitalAllocationPlan.upsert({
      where: {
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
      },

      update: {},

      create: {
        id: 1,
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
        ...DOCUMENTED_PLAN,
        source: 'DOCUMENTED_PLAN',
      },
    });
  }

  private buildResponse(
    plan: StoredCapitalPlan,
    taxAnalysis: ElToroTaxAnalysis,
  ) {
    const availableCapital = this.roundMoney(
      taxAnalysis.planningEstimates.netProceedsAfterEstimates,
    );

    const totalPlannedAllocation = this.roundMoney(
      plan.dubaiHomeReserve +
        plan.familyTransitionReserve +
        plan.longTermCoreInvestment,
    );

    const balance = this.roundMoney(availableCapital - totalPlannedAllocation);

    const unallocatedCapital = balance > 0 ? balance : 0;

    const fundingGap = balance < 0 ? Math.abs(balance) : 0;

    const allocationStatus =
      totalPlannedAllocation === 0
        ? 'NOT_SET'
        : fundingGap > 0
          ? 'OVER_ALLOCATED'
          : unallocatedCapital > 0
            ? 'UNDER_ALLOCATED'
            : 'BALANCED';

    const operationalStatus =
      taxAnalysis.planningEstimates.status === 'NOT_SET'
        ? 'ESTIMATES_NOT_SET'
        : allocationStatus === 'OVER_ALLOCATED'
          ? 'FUNDING_GAP'
          : allocationStatus === 'BALANCED'
            ? 'READY_FOR_PROFESSIONAL_VALIDATION'
            : 'ALLOCATION_INCOMPLETE';

    return {
      property: {
        code: taxAnalysis.property.code,
        name: taxAnalysis.property.name,
        expectedClosingDate: taxAnalysis.property.expectedClosingDate,
      },

      plan: {
        id: plan.id,
        currency: 'EUR',
        dubaiHomeReserve: this.roundMoney(plan.dubaiHomeReserve),
        familyTransitionReserve: this.roundMoney(plan.familyTransitionReserve),
        longTermCoreInvestment: this.roundMoney(plan.longTermCoreInvestment),
        totalPlannedAllocation,
        source: plan.source,
        updatedAt: plan.updatedAt.toISOString(),
      },

      reconciliation: {
        grossSalePrice: taxAnalysis.sale.grossSalePrice,
        debtToRepay: taxAnalysis.sale.debtToRepay,
        recordedSellingCosts: taxAnalysis.sale.recordedSellingCosts,
        estimatedTaxReserve: taxAnalysis.planningEstimates.estimatedTaxReserve,
        futureSaleCosts: taxAnalysis.planningEstimates.futureSaleCosts,
        availableCapital,
        totalPlannedAllocation,
        unallocatedCapital,
        fundingGap,
        balance,
      },

      status: {
        allocation: allocationStatus,
        operational: operationalStatus,
        fiscal: taxAnalysis.tax.status,
        planningEstimates: taxAnalysis.planningEstimates.status,
      },

      constraints: {
        professionalTaxValidationRequired: true,
        dubaiHomeReserveInvestibleInEquities: false,
      },

      warnings: [
        'La fiscalità resta NEEDS_VALIDATION fino alla validazione professionale.',
        'La riserva casa Dubai non deve essere investita in azioni.',
        'Il capitale allocabile utilizza esclusivamente stime manuali salvate e non rappresenta un ricavo netto fiscalmente validato.',
      ],
    };
  }

  async getElToroPlan() {
    const [plan, taxAnalysis] = await Promise.all([
      this.getStoredPlan(),
      this.taxAnalysisService.getElToroAnalysis(),
    ]);

    return this.buildResponse(plan, taxAnalysis);
  }

  async updateElToroPlan(input: UpdateElToroCapitalPlanInput) {
    const [current, taxAnalysis] = await Promise.all([
      this.getStoredPlan(),
      this.taxAnalysisService.getElToroAnalysis(),
    ]);

    const nextPlan = {
      dubaiHomeReserve: this.validateAmount(
        input.dubaiHomeReserve,
        current.dubaiHomeReserve,
        'La riserva casa Dubai',
      ),

      familyTransitionReserve: this.validateAmount(
        input.familyTransitionReserve,
        current.familyTransitionReserve,
        'La riserva famiglia e trasferimento',
      ),

      longTermCoreInvestment: this.validateAmount(
        input.longTermCoreInvestment,
        current.longTermCoreInvestment,
        'L’investimento core di lungo periodo',
      ),
    };

    const totalPlannedAllocation = this.roundMoney(
      nextPlan.dubaiHomeReserve +
        nextPlan.familyTransitionReserve +
        nextPlan.longTermCoreInvestment,
    );

    const availableCapital = this.roundMoney(
      taxAnalysis.planningEstimates.netProceedsAfterEstimates,
    );

    if (totalPlannedAllocation > availableCapital) {
      throw new BadRequestException(
        `Le destinazioni pianificate superano il capitale allocabile di ${this.roundMoney(
          totalPlannedAllocation - availableCapital,
        )} EUR.`,
      );
    }

    const plan = await this.prisma.capitalAllocationPlan.update({
      where: {
        sourcePropertyCode: EL_TORO_PROPERTY_CODE,
      },

      data: {
        ...nextPlan,
        source: 'USER_PLAN',
      },
    });

    return this.buildResponse(plan, taxAnalysis);
  }
}
