import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type InvestmentMetadata = {
  portfolio: string;
  isin: string | null;
  market: string | null;
  quantity: number | null;
  marketPrice: number | null;
};

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private extractMetadata(notes: string | null): InvestmentMetadata {
    const parts = (notes ?? '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    const readField = (label: string): string | null => {
      const prefix = `${label.toLowerCase()}:`;

      const match = parts.find((part) =>
        part.toLowerCase().startsWith(prefix),
      );

      if (!match) {
        return null;
      }

      return match.slice(match.indexOf(':') + 1).trim() || null;
    };

    const parseNumber = (value: string | null): number | null => {
      if (!value) {
        return null;
      }

      const parsed = Number(value.replace(',', '.'));

      return Number.isFinite(parsed) ? parsed : null;
    };

    return {
      portfolio: readField('Portafoglio') ?? 'Non classificato',
      isin: readField('ISIN'),
      market: readField('Mercato'),
      quantity: parseNumber(readField('Quantità')),
      marketPrice: parseNumber(readField('Prezzo')),
    };
  }

  async getPortfolio() {
    const household = await this.prisma.household.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    if (!household) {
      throw new NotFoundException(
        'Nessun household configurato.',
      );
    }

    const databasePositions =
      await this.prisma.wealthPosition.findMany({
        where: {
          householdId: household.id,
          category: 'INVESTMENT',
          status: 'ACTIVE',
        },
        orderBy: {
          valueBase: 'desc',
        },
      });

    const positions = databasePositions.map((position) => {
      const metadata = this.extractMetadata(position.notes);

      return {
        id: position.id,
        code: position.code,
        name: position.name,
        portfolio: metadata.portfolio,
        isin: metadata.isin,
        market: metadata.market,
        instrumentType:
          position.subcategory ?? 'Strumento finanziario',
        currency: position.currency,
        quantity: metadata.quantity,
        marketPrice: metadata.marketPrice,
        marketValue: position.valueBase.toNumber(),
        valuationDate: position.valuationDate.toISOString(),
        source: position.source,
      };
    });

    const totalValue = positions.reduce(
      (sum, position) => sum + position.marketValue,
      0,
    );

    const portfolioGroups = new Map<
      string,
      {
        name: string;
        value: number;
        positionCount: number;
      }
    >();

    const instrumentGroups = new Map<
      string,
      {
        name: string;
        value: number;
        positionCount: number;
      }
    >();

    for (const position of positions) {
      const portfolioGroup = portfolioGroups.get(
        position.portfolio,
      ) ?? {
        name: position.portfolio,
        value: 0,
        positionCount: 0,
      };

      portfolioGroup.value += position.marketValue;
      portfolioGroup.positionCount += 1;

      portfolioGroups.set(
        position.portfolio,
        portfolioGroup,
      );

      const instrumentGroup = instrumentGroups.get(
        position.instrumentType,
      ) ?? {
        name: position.instrumentType,
        value: 0,
        positionCount: 0,
      };

      instrumentGroup.value += position.marketValue;
      instrumentGroup.positionCount += 1;

      instrumentGroups.set(
        position.instrumentType,
        instrumentGroup,
      );
    }

    const portfolios = Array.from(
      portfolioGroups.values(),
    )
      .map((portfolio) => ({
        ...portfolio,
        weight:
          totalValue > 0
            ? (portfolio.value / totalValue) * 100
            : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const instrumentTypes = Array.from(
      instrumentGroups.values(),
    )
      .map((instrument) => ({
        ...instrument,
        weight:
          totalValue > 0
            ? (instrument.value / totalValue) * 100
            : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const enrichedPositions = positions.map((position) => ({
      ...position,
      weight:
        totalValue > 0
          ? (position.marketValue / totalValue) * 100
          : 0,
    }));

    const topFiveValue = enrichedPositions
      .slice(0, 5)
      .reduce(
        (sum, position) => sum + position.marketValue,
        0,
      );

    const etfPositions = enrichedPositions.filter((position) =>
      position.instrumentType.toUpperCase().includes('ETF'),
    );

    const etfValue = etfPositions.reduce(
      (sum, position) => sum + position.marketValue,
      0,
    );

    const latestValuationDate =
      databasePositions.length > 0
        ? databasePositions.reduce((latest, position) => {
            return position.valuationDate > latest
              ? position.valuationDate
              : latest;
          }, databasePositions[0].valuationDate)
        : null;

    return {
      household: {
        id: household.id,
        name: household.name,
        currency: household.currency,
      },

      summary: {
        totalValue,
        positionCount: positions.length,
        portfolioCount: portfolios.length,
        etfCount: etfPositions.length,
        etfValue,
        etfWeight:
          totalValue > 0 ? (etfValue / totalValue) * 100 : 0,
        topFiveValue,
        topFiveConcentration:
          totalValue > 0
            ? (topFiveValue / totalValue) * 100
            : 0,
      },

      asOfDate:
        latestValuationDate?.toISOString() ?? null,

      portfolios,
      instrumentTypes,
      topPositions: enrichedPositions.slice(0, 10),
      positions: enrichedPositions,
    };
  }
}
