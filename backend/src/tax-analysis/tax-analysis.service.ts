import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { LedgerService } from '../ledger/ledger.service';
import { PropertiesService } from '../properties/properties.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class TaxAnalysisService {
  constructor(
    private readonly propertiesService:
      PropertiesService,

    private readonly settingsService:
      SettingsService,

    private readonly ledgerService:
      LedgerService,
  ) {}

  getStatus() {
    return {
      module: 'tax-analysis',
      status: 'active',
    };
  }

  private roundMoney(
    value: number,
  ): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100,
      ) / 100
    );
  }

  async getElToroAnalysis() {
    const [
      propertiesOverview,
      settings,
      ledger,
    ] = await Promise.all([
      this.propertiesService.getOverview(),
      this.settingsService.getSettings(),
      this.ledgerService.getTransactions(
        1000,
      ),
    ]);

    const property =
      propertiesOverview.properties.find(
        (item) =>
          item.code ===
          'PROPERTY_EL_TORO',
      );

    if (!property) {
      throw new NotFoundException(
        'Immobile El Toro non trovato.',
      );
    }

    const saleExpenseTransactions =
      ledger.transactions.filter(
        (transaction) =>
          transaction.position?.code ===
            property.code &&
          transaction.transactionType ===
            'PROPERTY_EXPENSE' &&
          transaction.voidedAt === null,
      );

    const recordedSellingCosts =
      this.roundMoney(
        saleExpenseTransactions.reduce(
          (total, transaction) =>
            total +
            Math.abs(
              transaction.baseAmount,
            ),
          0,
        ),
      );

    const grossDifference =
      property.historicalCost === null
        ? null
        : this.roundMoney(
            property.grossValue -
              property.historicalCost,
          );

    const economicGainAfterCosts =
      grossDifference === null
        ? null
        : this.roundMoney(
            grossDifference -
              recordedSellingCosts,
          );

    const netProceedsBeforeTax =
      this.roundMoney(
        property.grossValue -
          property.debt -
          recordedSellingCosts,
      );

    const estimatedTaxReserve =
      this.roundMoney(
        Math.max(
          0,
          settings.estimatedTaxReserve,
        ),
      );

    const futureSaleCosts =
      this.roundMoney(
        Math.max(
          0,
          settings.futureSaleCosts,
        ),
      );

    const totalPlanningEstimates =
      this.roundMoney(
        estimatedTaxReserve +
          futureSaleCosts,
      );

    const netProceedsAfterEstimates =
      this.roundMoney(
        Math.max(
          0,
          netProceedsBeforeTax -
            totalPlanningEstimates,
        ),
      );

    return {
      property: {
        id: property.id,
        code: property.code,
        name: property.name,
        country: property.country,
        status: property.status,
        expectedClosingDate:
          property.expectedClosingDate,
      },

      sale: {
        grossSalePrice:
          property.grossValue,

        debtToRepay:
          property.debt,

        historicalCost:
          property.historicalCost,

        grossDifferenceFromHistoricalCost:
          grossDifference,

        recordedSellingCosts,

        economicGainAfterRecordedCosts:
          economicGainAfterCosts,

        netProceedsBeforeTax,
      },

      fiscalResidence: {
        current:
          settings.fiscalResidence,

        planned:
          settings.plannedFiscalResidence,
      },

      tax: {
        estimatedTax: null,
        taxableGain: null,
        netProceedsAfterTax: null,
        status: 'NEEDS_VALIDATION',
      },

      planningEstimates: {
        estimatedTaxReserve,
        futureSaleCosts,
        totalEstimatedDeductions:
          totalPlanningEstimates,
        netProceedsAfterEstimates,
        source: 'PLATFORM_SETTINGS',
        status:
          totalPlanningEstimates > 0
            ? 'USER_ESTIMATE'
            : 'NOT_SET',
      },

      evidence: {
        recordedSellingCostTransactionCount:
          saleExpenseTransactions.length,

        recordedSellingCostTransactions:
          saleExpenseTransactions.map(
            (transaction) => ({
              id: transaction.id,
              date:
                transaction.transactionDate,
              amount:
                Math.abs(
                  transaction.baseAmount,
                ),
              notes:
                transaction.notes,
            }),
          ),
      },

      warnings: [
        'La differenza rispetto al costo storico non rappresenta automaticamente la plusvalenza imponibile.',
        'La residenza fiscale effettiva deve essere verificata alla data del rogito.',
        'Imposta e ricavo netto dopo fiscalità richiedono validazione professionale.',
        'La riserva fiscale salvata è una stima manuale prudenziale e non rappresenta un’imposta calcolata.',
      ],
    };
  }
}
