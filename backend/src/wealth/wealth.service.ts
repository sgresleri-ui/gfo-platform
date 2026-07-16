import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type WealthSummary = {
  netWorth: number;
  liquidity: number;
  investments: number;
  realEstate: number;
  otherAssets: number;
  liabilities: number;
  currency: string;
  asOfDate: string | null;
  positionCount: number;
};

@Injectable()
export class WealthService {
  constructor(private readonly prisma: PrismaService) {}

  private async getHousehold() {
    const household = await this.prisma.household.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (!household) {
      throw new NotFoundException(
        'Nessun household configurato nel Wealth Registry.',
      );
    }

    return household;
  }

  async getSummary(): Promise<WealthSummary> {
    const household = await this.getHousehold();

    const positions = await this.prisma.wealthPosition.findMany({
      where: {
        householdId: household.id,
        status: 'ACTIVE',
      },
      orderBy: [
        {
          category: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });

    let liquidity = 0;
    let investments = 0;
    let realEstate = 0;
    let otherAssets = 0;
    let liabilities = 0;
    let latestValuationDate: Date | null = null;

    for (const position of positions) {
      const value = position.valueBase.toNumber();

      if (
        !latestValuationDate ||
        position.valuationDate > latestValuationDate
      ) {
        latestValuationDate = position.valuationDate;
      }

      if (position.isLiability || position.category === 'LIABILITY') {
        liabilities += Math.abs(value);
        continue;
      }

      switch (position.category) {
        case 'LIQUIDITY':
          liquidity += value;
          break;

        case 'INVESTMENT':
          investments += value;
          break;

        case 'REAL_ESTATE':
          realEstate += value;
          break;

        default:
          otherAssets += value;
          break;
      }
    }

    const netWorth =
      liquidity +
      investments +
      realEstate +
      otherAssets -
      liabilities;

    return {
      netWorth,
      liquidity,
      investments,
      realEstate,
      otherAssets,
      liabilities,
      currency: household.currency,
      asOfDate: latestValuationDate
        ? latestValuationDate.toISOString()
        : null,
      positionCount: positions.length,
    };
  }

  async getRegistry() {
    const household = await this.getHousehold();

    const positions = await this.prisma.wealthPosition.findMany({
      where: {
        householdId: household.id,
      },
      orderBy: [
        {
          category: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });

    return {
      household: {
        id: household.id,
        name: household.name,
        currency: household.currency,
      },

      positions: positions.map((position) => ({
        id: position.id,
        code: position.code,
        name: position.name,
        category: position.category,
        subcategory: position.subcategory,
        country: position.country,
        currency: position.currency,
        nativeAmount: position.nativeAmount?.toNumber() ?? null,
        fxRateToBase: position.fxRateToBase?.toNumber() ?? null,
        valueBase: position.valueBase.toNumber(),
        baseCurrency: position.baseCurrency,
        isLiability: position.isLiability,
        valuationDate: position.valuationDate.toISOString(),
        source: position.source,
        status: position.status,
        notes: position.notes,
      })),

      count: positions.length,
    };
  }
}
