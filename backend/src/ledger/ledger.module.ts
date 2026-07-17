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

@Module({
  controllers: [
    LedgerController,
  ],

  providers: [
    LedgerService,
    TransactionLedgerService,
  ],
})
export class LedgerModule {}
