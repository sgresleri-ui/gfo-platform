import { Module } from '@nestjs/common';

import { ImportApplicationService } from './import-application.service';
import { ImportComparisonService } from './import-comparison.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  controllers: [ImportsController],

  providers: [
    ImportsService,
    ImportComparisonService,
    ImportApplicationService,
  ],
})
export class ImportsModule {}
