import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImportModule } from './import/import.module';
import { PrismaModule } from './prisma/prisma.module';
import { WealthModule } from './wealth/wealth.module';

@Module({
  imports: [
    PrismaModule,
    AccountsModule,
    ImportModule,
    WealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
