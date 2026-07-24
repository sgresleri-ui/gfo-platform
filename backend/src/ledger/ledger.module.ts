import { Module } from '@nestjs/common';

import {
  LedgerController,
} from './ledger.controller';

import {
  LedgerService,
} from './ledger.service';

import {
  TransactionLedgerService,
} from './transaction-ledger.service';

import {
  TransactionImportService,
} from './transaction-import.service';

@Module({
  controllers: [
    LedgerController,
  ],

  providers: [
    LedgerService,
    TransactionLedgerService,
    TransactionImportService,
  ],
})
export class LedgerModule {}
