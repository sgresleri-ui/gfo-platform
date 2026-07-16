import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PropertyStatus = 'OWNED' | 'HELD_FOR_SALE';

type PropertyRecord = {
  id: number;
  code: string;
  name: string;
  country: string | null;
  currency: string;
  grossValue: number;
  debt: number;
  netEquity: number;
  ltv: number;
  status: PropertyStatus;
  historicalCost: number | null;
  differenceFromHistoricalCost: number | null;
  expectedClosingDate: string | null;
  liabilityName: string | null;
  liabilityType: string | null;
  valuationDate: string;
  source: string;
  notes: string | null;
};

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  private getPropertyKey(code: string): string {
    return code
      .replace(/^PROPERTY_/, '')
      .replace(/^LIABILITY_/, '');
  }

  private parseHistoricalCost(notes: string | null): number | null {
    if (!notes) {
      return null;
    }

    const match = notes.match(
      /Costo storico[^:]*:\s*EUR\s*([0-9.]+)/i,
    );

    if (!match) {
      return null;
    }

    const parsed = Number(match[1]);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseClosingDate(notes: string | null): string | null {
    if (!notes) {
      return null;
    }

    const match = notes.match(
      /Rogito previsto:\s*(\d{2})\/(\d{2})\/(\d{4})/i,
    );

    if (!match) {
      return null;
    }

    const [, day, month, year] = match;

    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  async getOverview() {
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

    const propertyPositions =
      await this.prisma.wealthPosition.findMany({
        where: {
          householdId: household.id,
          category: 'REAL_ESTATE',
          status: 'ACTIVE',
        },
        orderBy: {
          valueBase: 'desc',
        },
      });

    const liabilityPositions =
      await this.prisma.wealthPosition.findMany({
        where: {
          householdId: household.id,
          category: 'LIABILITY',
          status: 'ACTIVE',
        },
      });

    const liabilitiesByProperty = new Map<
      string,
      {
        value: number;
        name: string;
        type: string | null;
      }
    >();

    for (const liability of liabilityPositions) {
      const key = this.getPropertyKey(liability.code);
      const current = liabilitiesByProperty.get(key);

      liabilitiesByProperty.set(key, {
        value:
          (current?.value ?? 0) +
          Math.abs(liability.valueBase.toNumber()),
        name: current
          ? `${current.name}; ${liability.name}`
          : liability.name,
        type:
          liability.subcategory ??
          current?.type ??
          null,
      });
    }

    const properties: PropertyRecord[] =
      propertyPositions.map((property) => {
        const key = this.getPropertyKey(property.code);
        const liability =
          liabilitiesByProperty.get(key) ?? null;

        const grossValue = property.valueBase.toNumber();
        const debt = liability?.value ?? 0;
        const netEquity = grossValue - debt;
        const ltv =
          grossValue > 0
            ? (debt / grossValue) * 100
            : 0;

        const historicalCost =
          this.parseHistoricalCost(property.notes);

        return {
          id: property.id,
          code: property.code,
          name: property.name,
          country: property.country,
          currency: property.currency,
          grossValue,
          debt,
          netEquity,
          ltv,
          status:
            property.subcategory ===
            'PROPERTY_HELD_FOR_SALE'
              ? 'HELD_FOR_SALE'
              : 'OWNED',
          historicalCost,
          differenceFromHistoricalCost:
            historicalCost === null
              ? null
              : grossValue - historicalCost,
          expectedClosingDate:
            this.parseClosingDate(property.notes),
          liabilityName: liability?.name ?? null,
          liabilityType: liability?.type ?? null,
          valuationDate:
            property.valuationDate.toISOString(),
          source: property.source,
          notes: property.notes,
        };
      });

    const grossValue = properties.reduce(
      (sum, property) => sum + property.grossValue,
      0,
    );

    const debt = properties.reduce(
      (sum, property) => sum + property.debt,
      0,
    );

    const netEquity = grossValue - debt;

    const heldForSaleValue = properties
      .filter(
        (property) =>
          property.status === 'HELD_FOR_SALE',
      )
      .reduce(
        (sum, property) => sum + property.grossValue,
        0,
      );

    const highestLtvProperty =
      properties.length > 0
        ? properties.reduce((highest, property) =>
            property.ltv > highest.ltv
              ? property
              : highest,
          )
        : null;

    const countriesMap = new Map<
      string,
      {
        name: string;
        grossValue: number;
        netEquity: number;
        propertyCount: number;
      }
    >();

    for (const property of properties) {
      const country =
        property.country ?? 'Non classificato';

      const current = countriesMap.get(country) ?? {
        name: country,
        grossValue: 0,
        netEquity: 0,
        propertyCount: 0,
      };

      current.grossValue += property.grossValue;
      current.netEquity += property.netEquity;
      current.propertyCount += 1;

      countriesMap.set(country, current);
    }

    const countries = Array.from(
      countriesMap.values(),
    )
      .map((country) => ({
        ...country,
        weight:
          grossValue > 0
            ? (country.grossValue / grossValue) * 100
            : 0,
      }))
      .sort(
        (first, second) =>
          second.grossValue - first.grossValue,
      );

    const latestValuationDate =
      propertyPositions.length > 0
        ? propertyPositions.reduce(
            (latest, property) =>
              property.valuationDate > latest
                ? property.valuationDate
                : latest,
            propertyPositions[0].valuationDate,
          )
        : null;

    return {
      household: {
        id: household.id,
        name: household.name,
        currency: household.currency,
      },

      summary: {
        grossValue,
        debt,
        netEquity,
        propertyCount: properties.length,
        weightedLtv:
          grossValue > 0
            ? (debt / grossValue) * 100
            : 0,
        heldForSaleValue,
        heldForSaleCount: properties.filter(
          (property) =>
            property.status === 'HELD_FOR_SALE',
        ).length,
        highestLtv:
          highestLtvProperty?.ltv ?? 0,
        highestLtvProperty:
          highestLtvProperty?.name ?? null,
      },

      asOfDate:
        latestValuationDate?.toISOString() ?? null,

      countries,
      properties,
    };
  }
}
