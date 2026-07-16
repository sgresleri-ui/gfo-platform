import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  DashboardController,
  WealthController,
} from './wealth.controller';
import { WealthService } from './wealth.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, WealthController],
  providers: [WealthService],
  exports: [WealthService],
})
export class WealthModule {}
