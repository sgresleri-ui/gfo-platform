import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import {
  EconomicAssumptionProfilesController,
} from './economic-assumption-profiles.controller';

import {
  EconomicAssumptionProfilesService,
} from './economic-assumption-profiles.service';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    EconomicAssumptionProfilesController,
  ],

  providers: [
    EconomicAssumptionProfilesService,
  ],

  exports: [
    EconomicAssumptionProfilesService,
  ],
})
export class EconomicAssumptionProfilesModule {}
