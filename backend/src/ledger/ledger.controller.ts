import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';

import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
  constructor(
    private readonly ledgerService:
      LedgerService,
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

  @Get('transactions')
  getTransactions(
    @Query('limit') limit?: string,
  ) {
    return this.ledgerService.getTransactions(
      limit ? Number(limit) : 100,
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
