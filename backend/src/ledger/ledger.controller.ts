import {
  Body,
  Controller,
  Get,
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

  @Post('capture')
  captureCurrentState(
    @Body('confirm') confirm: boolean,
  ) {
    return this.ledgerService.captureCurrentState(
      confirm,
    );
  }
}
