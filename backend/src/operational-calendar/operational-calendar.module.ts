import { Module } from '@nestjs/common';

import { OperationalCalendarController } from './operational-calendar.controller';
import { OperationalCalendarService } from './operational-calendar.service';

@Module({
  controllers: [
    OperationalCalendarController,
  ],
  providers: [
    OperationalCalendarService,
  ],
})
export class OperationalCalendarModule {}
