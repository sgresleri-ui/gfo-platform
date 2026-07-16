import { DecisionsModule } from './decisions/decisions.module';
import { SettingsModule } from './settings/settings.module';
import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImportModule } from './import/import.module';
import { InvestmentsModule } from './investments/investments.module';
import { LiquidityModule } from './liquidity/liquidity.module';
import { PropertiesModule } from './properties/properties.module';
import { BudgetModule } from './budget/budget.module';
import { PrismaModule } from './prisma/prisma.module';
import { WealthModule } from './wealth/wealth.module';

@Module({
  imports: [
    DecisionsModule,
    SettingsModule,
    PrismaModule,
    AccountsModule,
    ImportModule,
    WealthModule,
    InvestmentsModule,
    LiquidityModule,
    PropertiesModule,
    BudgetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
