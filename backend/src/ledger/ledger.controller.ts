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

@Controller('ledger')
export class LedgerController {
  constructor(
    private readonly ledgerService:
      LedgerService,

    private readonly transactionService:
      TransactionLedgerService,
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
