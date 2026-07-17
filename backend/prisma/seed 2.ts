import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  let household = await prisma.household.findFirst({
    orderBy: {
      id: 'asc',
    },
  });

  if (!household) {
    household = await prisma.household.create({
      data: {
        name: 'Famiglia Gresleri',
        currency: 'EUR',
      },
    });
  }

  const valuationDate = new Date('2026-07-16T00:00:00.000Z');

  const positions = [
    {
      code: 'CONSOLIDATED_LIQUIDITY',
      name: 'Liquidità consolidata',
      category: 'LIQUIDITY',
      subcategory: 'CASH_AND_DEPOSITS',
      country: null,
      currency: 'EUR',
      nativeAmount: new Prisma.Decimal('230866.37'),
      fxRateToBase: new Prisma.Decimal('1'),
      valueBase: new Prisma.Decimal('230866.37'),
      baseCurrency: 'EUR',
      isLiability: false,
      valuationDate,
      source: 'PROVISIONAL_2026',
      status: 'ACTIVE',
      notes:
        'Valore provvisorio iniziale. Sarà sostituito dal dettaglio dei singoli conti.',
    },
    {
      code: 'CONSOLIDATED_INVESTMENTS',
      name: 'Investimenti finanziari consolidati',
      category: 'INVESTMENT',
      subcategory: 'FINANCIAL_PORTFOLIO',
      country: null,
      currency: 'EUR',
      nativeAmount: new Prisma.Decimal('1510854'),
      fxRateToBase: new Prisma.Decimal('1'),
      valueBase: new Prisma.Decimal('1510854'),
      baseCurrency: 'EUR',
      isLiability: false,
      valuationDate,
      source: 'PROVISIONAL_2026',
      status: 'ACTIVE',
      notes:
        'Valore provvisorio iniziale. Sarà sostituito dalle posizioni Fineco e IBKR.',
    },
    {
      code: 'CONSOLIDATED_REAL_ESTATE',
      name: 'Patrimonio immobiliare consolidato',
      category: 'REAL_ESTATE',
      subcategory: 'PROPERTY',
      country: null,
      currency: 'EUR',
      nativeAmount: new Prisma.Decimal('775000'),
      fxRateToBase: new Prisma.Decimal('1'),
      valueBase: new Prisma.Decimal('775000'),
      baseCurrency: 'EUR',
      isLiability: false,
      valuationDate,
      source: 'PROVISIONAL_2026',
      status: 'ACTIVE',
      notes:
        'Valore provvisorio iniziale. Sarà sostituito dal registro dei singoli immobili.',
    },
    {
      code: 'CONSOLIDATED_LIABILITIES',
      name: 'Passività consolidate',
      category: 'LIABILITY',
      subcategory: 'DEBT',
      country: null,
      currency: 'EUR',
      nativeAmount: new Prisma.Decimal('30400'),
      fxRateToBase: new Prisma.Decimal('1'),
      valueBase: new Prisma.Decimal('30400'),
      baseCurrency: 'EUR',
      isLiability: true,
      valuationDate,
      source: 'PROVISIONAL_2026',
      status: 'ACTIVE',
      notes:
        'Valore provvisorio iniziale. Sarà sostituito dal dettaglio dei debiti residui.',
    },
  ];

  for (const position of positions) {
    await prisma.wealthPosition.upsert({
      where: {
        code: position.code,
      },

      update: {
        ...position,
        householdId: household.id,
      },

      create: {
        ...position,
        householdId: household.id,
      },
    });
  }

  console.log(
    `Wealth Registry inizializzato: ${positions.length} posizioni.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
