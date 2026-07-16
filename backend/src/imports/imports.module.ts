import { Module } from '@nestjs/common';

import { ImportComparisonService } from './import-comparison.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  controllers: [ImportsController],

  providers: [
    ImportsService,
    ImportComparisonService,
  ],
})
export class ImportsModule {}
