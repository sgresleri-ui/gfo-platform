import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  PrismaClient,
} from '@prisma/client';

const TRANSACTION_TYPES = {
  BUY: {
    label: 'Acquisto',
    direction: 'OUTFLOW',
    positionRecommended: true,
  },

  SELL: {
    label: 'Vendita',
    direction: 'INFLOW',
    positionRecommended: true,
  },

  DIVIDEND: {
    label: 'Dividendo',
    direction: 'INFLOW',
    positionRecommended: true,
  },

  INTEREST: {
    label: 'Interesse',
    direction: 'INFLOW',
    positionRecommended: false,
  },

  COUPON: {
    label: 'Cedola',
    direction: 'INFLOW',
    positionRecommended: true,
  },

  DEPOSIT: {
    label: 'Versamento',
    direction: 'INFLOW',
    positionRecommended: false,
  },

  WITHDRAWAL: {
    label: 'Prelievo',
    direction: 'OUTFLOW',
    positionRecommended: false,
  },

  FEE: {
    label: 'Costo o commissione',
    direction: 'OUTFLOW',
    positionRecommended: false,
  },

  TAX: {
    label: 'Imposta',
    direction: 'OUTFLOW',
    positionRecommended: false,
  },

  TRANSFER: {
    label: 'Trasferimento',
    direction: 'TRANSFER',
    positionRecommended: false,
  },

  RENT_INCOME: {
    label: 'Canone di locazione',
    direction: 'INFLOW',
    positionRecommended: true,
  },

  PROPERTY_EXPENSE: {
    label: 'Spesa immobiliare',
    direction: 'OUTFLOW',
    positionRecommended: true,
  },

  OTHER_INCOME: {
    label: 'Altro ricavo',
    direction: 'INFLOW',
    positionRecommended: false,
  },

  OTHER_EXPENSE: {
    label: 'Altra spesa',
    direction: 'OUTFLOW',
    positionRecommended: false,
  },
} as const;

type TransactionType =
  keyof typeof TRANSACTION_TYPES;

export type CreateWealthTransactionInput = {
  confirm: boolean;
  transactionDate: string;
  transactionType: string;
  positionCode?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  grossAmount: number;
  fees?: number | null;
  taxes?: number | null;
  currency?: string | null;
  fxRateToBase?: number | null;
  sourceAccountCode?: string | null;
  destinationAccountCode?: string | null;
  source?: string | null;
  externalReference?: string | null;
  notes?: string | null;
};

@Injectable()
export class TransactionLedgerService
  implements OnModuleDestroy
{
  private readonly prisma =
    new PrismaClient();

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  private roundCurrency(
    value: number,
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100,
      ) / 100
    );
  }

  private normalizeText(
    value?: string | null,
  ): string | null {
    const normalized =
      value?.trim() ?? '';

    return normalized.length > 0
      ? normalized
      : null;
  }

  private positiveNumber(
    value: number,
    fieldName: string,
  ): number {
    const normalized =
      Number(value);

    if (
      !Number.isFinite(normalized) ||
      normalized <= 0
    ) {
      throw new BadRequestException(
        `${fieldName} deve essere maggiore di zero.`,
      );
    }

    return normalized;
  }

  private nonNegativeNumber(
    value: number | null | undefined,
    fieldName: string,
  ): number {
    const normalized =
      Number(value ?? 0);

    if (
      !Number.isFinite(normalized) ||
      normalized < 0
    ) {
      throw new BadRequestException(
        `${fieldName} non può essere negativo.`,
      );
    }

    return normalized;
  }

  private parseTransactionDate(
    value: string,
  ): Date {
    const transactionDate =
      new Date(value);

    if (
      Number.isNaN(
        transactionDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Data operazione non valida.',
      );
    }

    return transactionDate;
  }

  private parseTransactionType(
    value: string,
  ): TransactionType {
    const normalized =
      value.trim().toUpperCase();

    if (
      !Object.prototype.hasOwnProperty.call(
        TRANSACTION_TYPES,
        normalized,
      )
    ) {
      throw new BadRequestException(
        `Tipo operazione non supportato: ${value}.`,
      );
    }

    return normalized as TransactionType;
  }

  private serializeTransaction(
    transaction: {
      id: string;
      transactionDate: Date;
      transactionType: string;
      direction: string;
      quantity: unknown;
      unitPrice: unknown;
      grossAmount: unknown;
      fees: unknown;
      taxes: unknown;
      netAmount: unknown;
      currency: string;
      fxRateToBase: unknown;
      baseAmount: unknown;
      baseCurrency: string;
      sourceAccountCode: string | null;
      destinationAccountCode: string | null;
      source: string;
      status: string;
      externalReference: string | null;
      notes: string | null;
      voidedAt: Date | null;
      voidReason: string | null;
      createdAt: Date;
      position?: {
        code: string;
        name: string;
      } | null;
    },
  ) {
    return {
      id: transaction.id,

      transactionDate:
        transaction.transactionDate
          .toISOString(),

      transactionType:
        transaction.transactionType,

      direction:
        transaction.direction,

      position:
        transaction.position ?? null,

      quantity:
        transaction.quantity === null
          ? null
          : Number(
              transaction.quantity,
            ),

      unitPrice:
        transaction.unitPrice === null
          ? null
          : Number(
              transaction.unitPrice,
            ),

      grossAmount:
        Number(
          transaction.grossAmount,
        ),

      fees:
        Number(transaction.fees),

      taxes:
        Number(transaction.taxes),

      netAmount:
        Number(
          transaction.netAmount,
        ),

      currency:
        transaction.currency,

      fxRateToBase:
        transaction.fxRateToBase ===
        null
          ? null
          : Number(
              transaction.fxRateToBase,
            ),

      baseAmount:
        Number(
          transaction.baseAmount,
        ),

      baseCurrency:
        transaction.baseCurrency,

      sourceAccountCode:
        transaction.sourceAccountCode,

      destinationAccountCode:
        transaction.destinationAccountCode,

      source:
        transaction.source,

      status:
        transaction.status,

      externalReference:
        transaction.externalReference,

      notes:
        transaction.notes,

      voidedAt:
        transaction.voidedAt
          ?.toISOString() ?? null,

      voidReason:
        transaction.voidReason,

      createdAt:
        transaction.createdAt
          .toISOString(),
    };
  }

  async getActivePositions() {
    const positions =
      await this.prisma.wealthPosition.findMany(
        {
          where: {
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

          select: {
            code: true,
            name: true,
            category: true,
            subcategory: true,
            currency: true,
          },
        },
      );

    return {
      count: positions.length,
      positions,
    };
  }

  async voidTransaction(
    transactionId: string,
    confirmed: boolean,
    reason?: string | null,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'L’annullamento richiede conferma esplicita.',
      );
    }

    const normalizedReason =
      this.normalizeText(reason);

    if (!normalizedReason) {
      throw new BadRequestException(
        'Indicare la motivazione dell’annullamento.',
      );
    }

    const existing =
      await this.prisma.wealthTransaction.findUnique(
        {
          where: {
            id: transactionId,
          },

          include: {
            position: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      );

    if (!existing) {
      throw new NotFoundException(
        'Movimento non trovato.',
      );
    }

    if (existing.status !== 'POSTED') {
      throw new BadRequestException(
        'Il movimento risulta già annullato o non è più attivo.',
      );
    }

    const transaction =
      await this.prisma.wealthTransaction.update(
        {
          where: {
            id: transactionId,
          },

          data: {
            status: 'VOIDED',
            voidedAt: new Date(),
            voidReason: normalizedReason,
          },

          include: {
            position: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      );

    return {
      voided: true,

      transaction:
        this.serializeTransaction(
          transaction,
        ),
    };
  }

  getTransactionTypes() {
    return {
      types: Object.entries(
        TRANSACTION_TYPES,
      ).map(
        ([code, configuration]) => ({
          code,
          label:
            configuration.label,
          direction:
            configuration.direction,

          positionRecommended:
            configuration
              .positionRecommended,
        }),
      ),
    };
  }

  async getTransactionSummary() {
    const transactions =
      await this.prisma.wealthTransaction.findMany(
        {
          where: {
            status: 'POSTED',
          },

          select: {
            direction: true,
            baseAmount: true,
            fees: true,
            taxes: true,
            fxRateToBase: true,
          },
        },
      );

    let inflows = 0;
    let outflows = 0;
    let transfers = 0;
    let fees = 0;
    let taxes = 0;

    for (const transaction of transactions) {
      const amount =
        Number(transaction.baseAmount);

      if (
        transaction.direction ===
        'INFLOW'
      ) {
        inflows += amount;
      } else if (
        transaction.direction ===
        'OUTFLOW'
      ) {
        outflows += amount;
      } else if (
        transaction.direction ===
        'TRANSFER'
      ) {
        transfers += amount;
      }

      const fxRate =
        transaction.fxRateToBase === null
          ? 1
          : Number(
              transaction.fxRateToBase,
            );

      fees +=
        Number(transaction.fees) *
        fxRate;

      taxes +=
        Number(transaction.taxes) *
        fxRate;
    }

    return {
      transactions:
        transactions.length,

      inflows:
        this.roundCurrency(inflows),

      outflows:
        this.roundCurrency(outflows),

      transfers:
        this.roundCurrency(transfers),

      netCashFlow:
        this.roundCurrency(
          inflows - outflows,
        ),

      fees:
        this.roundCurrency(fees),

      taxes:
        this.roundCurrency(taxes),
    };
  }

  async createTransaction(
    input: CreateWealthTransactionInput,
  ) {
    if (!input.confirm) {
      throw new BadRequestException(
        'La registrazione richiede conferma esplicita.',
      );
    }

    const household =
      await this.prisma.household.findFirst({
        orderBy: {
          id: 'asc',
        },

        select: {
          id: true,
          currency: true,
        },
      });

    if (!household) {
      throw new NotFoundException(
        'Household principale non trovato.',
      );
    }

    const transactionType =
      this.parseTransactionType(
        input.transactionType,
      );

    const configuration =
      TRANSACTION_TYPES[
        transactionType
      ];

    const transactionDate =
      this.parseTransactionDate(
        input.transactionDate,
      );

    const grossAmount =
      this.roundCurrency(
        this.positiveNumber(
          input.grossAmount,
          'Importo lordo',
        ),
      );

    const fees =
      this.roundCurrency(
        this.nonNegativeNumber(
          input.fees,
          'Commissioni',
        ),
      );

    const taxes =
      this.roundCurrency(
        this.nonNegativeNumber(
          input.taxes,
          'Imposte',
        ),
      );

    let netAmount: number;

    if (
      configuration.direction ===
      'INFLOW'
    ) {
      netAmount =
        grossAmount - fees - taxes;

      if (netAmount <= 0) {
        throw new BadRequestException(
          'L’importo netto in entrata deve essere maggiore di zero.',
        );
      }
    } else if (
      configuration.direction ===
      'OUTFLOW'
    ) {
      netAmount =
        grossAmount + fees + taxes;
    } else {
      netAmount =
        grossAmount;
    }

    netAmount =
      this.roundCurrency(netAmount);

    const currency =
      (
        input.currency ??
        household.currency
      )
        .trim()
        .toUpperCase();

    if (
      !/^[A-Z]{3}$/.test(currency)
    ) {
      throw new BadRequestException(
        'La valuta deve essere espressa con un codice ISO di tre lettere.',
      );
    }

    const baseCurrency =
      household.currency
        .trim()
        .toUpperCase();

    let fxRateToBase:
      | number
      | null = null;

    if (currency === baseCurrency) {
      fxRateToBase = 1;
    } else {
      fxRateToBase =
        this.positiveNumber(
          Number(
            input.fxRateToBase,
          ),
          'Cambio verso la valuta base',
        );
    }

    const baseAmount =
      this.roundCurrency(
        netAmount *
          fxRateToBase,
      );

    const positionCode =
      this.normalizeText(
        input.positionCode,
      );

    const position =
      positionCode
        ? await this.prisma.wealthPosition.findUnique(
            {
              where: {
                code:
                  positionCode,
              },

              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          )
        : null;

    if (
      positionCode &&
      !position
    ) {
      throw new NotFoundException(
        `Posizione ${positionCode} non trovata.`,
      );
    }

    const sourceAccountCode =
      this.normalizeText(
        input.sourceAccountCode,
      );

    const destinationAccountCode =
      this.normalizeText(
        input.destinationAccountCode,
      );

    if (
      transactionType ===
      'TRANSFER'
    ) {
      if (
        !sourceAccountCode ||
        !destinationAccountCode
      ) {
        throw new BadRequestException(
          'Il trasferimento richiede conto di origine e conto di destinazione.',
        );
      }

      if (
        sourceAccountCode ===
        destinationAccountCode
      ) {
        throw new BadRequestException(
          'Il conto di origine e quello di destinazione devono essere differenti.',
        );
      }
    }

    const source =
      this.normalizeText(
        input.source,
      ) ?? 'MANUAL';

    const externalReference =
      this.normalizeText(
        input.externalReference,
      );

    if (externalReference) {
      const duplicate =
        await this.prisma.wealthTransaction.findFirst(
          {
            where: {
              source,
              externalReference,
            },

            select: {
              id: true,
            },
          },
        );

      if (duplicate) {
        throw new BadRequestException(
          'Esiste già un’operazione con la stessa fonte e lo stesso riferimento esterno.',
        );
      }
    }

    const quantity =
      input.quantity === null ||
      input.quantity === undefined
        ? null
        : this.positiveNumber(
            input.quantity,
            'Quantità',
          );

    const unitPrice =
      input.unitPrice === null ||
      input.unitPrice === undefined
        ? null
        : this.positiveNumber(
            input.unitPrice,
            'Prezzo unitario',
          );

    const transaction =
      await this.prisma.wealthTransaction.create(
        {
          data: {
            householdId:
              household.id,

            positionId:
              position?.id ?? null,

            transactionDate,

            transactionType,

            direction:
              configuration.direction,

            quantity,
            unitPrice,
            grossAmount,
            fees,
            taxes,
            netAmount,
            currency,
            fxRateToBase,
            baseAmount,
            baseCurrency,
            sourceAccountCode,
            destinationAccountCode,
            source,
            status: 'POSTED',
            externalReference,

            notes:
              this.normalizeText(
                input.notes,
              ),
          },

          include: {
            position: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      );

    return {
      created: true,

      transaction:
        this.serializeTransaction(
          transaction,
        ),
    };
  }
}
