import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { HouseholdModule } from './household/household.module';
import { AccountModule } from './account/account.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [
    PrismaModule,
    HouseholdModule,
    AccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}