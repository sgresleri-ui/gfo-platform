import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import {
  LedgerService,
} from './ledger.service';

import {
  TransactionLedgerService,
  type CreateWealthTransactionInput,
} from './transaction-ledger.service';

import {
  TransactionImportService,
} from './transaction-import.service';

@Controller('ledger')
export class LedgerController {
  constructor(
    private readonly ledgerService:
      LedgerService,

    private readonly transactionService:
      TransactionLedgerService,

    private readonly transactionImportService:
      TransactionImportService,
  ) {}

  @Get('summary')
  getSummary() {
    return this.ledgerService.getSummary();
  }

  @Get('net-worth')
  getNetWorthHistory(
    @Query('limit') limit?: string,
  ) {
    return this.ledgerService.getNetWorthHistory(
      limit ? Number(limit) : 100,
    );
  }

  @Get('positions')
  getPositions() {
    return this.transactionService
      .getActivePositions();
  }

  @Get('transaction-types')
  getTransactionTypes() {
    return this.transactionService
      .getTransactionTypes();
  }

  @Get('transactions/import/preview/bbva')
  previewBbvaTransactions() {
    return this.transactionImportService
      .previewBbva();
  }

  @Post('transactions/import/bbva')
  importBbvaTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importBbva(confirm);
  }

  @Get('transactions/import/preview/rakbank-eur')
  previewRakBankEurTransactions() {
    return this.transactionImportService
      .previewRakBankEur();
  }

  @Post('transactions/import/rakbank-eur')
  importRakBankEurTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importRakBankEur(confirm);
  }

  @Get('transactions/import/preview/rakbank-aed')
  previewRakBankAedTransactions() {
    return this.transactionImportService
      .previewRakBankAed();
  }

  @Post('transactions/import/rakbank-aed')
  importRakBankAedTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importRakBankAed(confirm);
  }

  @Get('transactions/import/preview/revolut')
  previewRevolutTransactions() {
    return this.transactionImportService
      .previewRevolut();
  }

  @Post('transactions/import/revolut')
  importRevolutTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importRevolut(confirm);
  }

  @Get('transactions/import/preview/ibkr')
  previewIbkrTransactions() {
    return this.transactionImportService
      .previewIbkr();
  }

  @Post('transactions/import/ibkr')
  importIbkrTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importIbkr(confirm);
  }

  @Get('transactions/import/preview/fineco-sa')
  previewFinecoSaTransactions() {
    return this.transactionImportService
      .previewFinecoSa();
  }

  @Post('transactions/import/fineco-sa')
  importFinecoSaTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importFinecoSa(confirm);
  }

  @Get('transactions/import/preview/fineco-st')
  previewFinecoStTransactions() {
    return this.transactionImportService
      .previewFinecoSt();
  }

  @Post('transactions/import/fineco-st')
  importFinecoStTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importFinecoSt(confirm);
  }

  @Get('transactions/import/preview/amex')
  previewAmexTransactions() {
    return this.transactionImportService
      .previewAmex();
  }

  @Post('transactions/import/amex')
  importAmexTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importAmex(confirm);
  }

  @Get('transactions/import/preview/cash')
  previewCashTransactions() {
    return this.transactionImportService
      .previewCash();
  }

  @Post('transactions/import/cash')
  importCashTransactions(
    @Body('confirm') confirm: boolean,
  ) {
    return this.transactionImportService
      .importCash(confirm);
  }

  @Get('transactions/summary')
  getTransactionSummary() {
    return this.transactionService
      .getTransactionSummary();
  }

  @Get('transactions')
  getTransactions(
    @Query('limit') limit?: string,
  ) {
    return this.ledgerService.getTransactions(
      limit ? Number(limit) : 100,
    );
  }

  @Post('transactions')
  createTransaction(
    @Body()
    input:
      CreateWealthTransactionInput,
  ) {
    return this.transactionService
      .createTransaction(input);
  }

  @Post('transactions/:id/void')
  voidTransaction(
    @Param('id') id: string,
    @Body('confirm') confirm: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.transactionService
      .voidTransaction(
        id,
        confirm,
        reason,
      );
  }

  @Post('capture')
  captureCurrentState(
    @Body('confirm') confirm: boolean,
  ) {
    return this.ledgerService.captureCurrentState(
      confirm,
    );
  }
}
