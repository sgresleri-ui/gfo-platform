import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LiquidityController } from './liquidity.controller';
import { LiquidityService } from './liquidity.service';

@Module({
  imports: [PrismaModule],
  controllers: [LiquidityController],
  providers: [LiquidityService],
  exports: [LiquidityService],
})
export class LiquidityModule {}
