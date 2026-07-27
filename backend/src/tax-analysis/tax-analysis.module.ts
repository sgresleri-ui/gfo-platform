import { Module } from '@nestjs/common';

import { LedgerModule } from '../ledger/ledger.module';
import { PropertiesModule } from '../properties/properties.module';
import { SettingsModule } from '../settings/settings.module';

import { TaxAnalysisController } from './tax-analysis.controller';
import { TaxAnalysisService } from './tax-analysis.service';

@Module({
  imports: [
    PropertiesModule,
    SettingsModule,
    LedgerModule,
  ],
  controllers: [
    TaxAnalysisController,
  ],
  providers: [
    TaxAnalysisService,
  ],
  exports: [
    TaxAnalysisService,
  ],
})
export class TaxAnalysisModule {}
