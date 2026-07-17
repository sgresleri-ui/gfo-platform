import { Module } from '@nestjs/common';

import {
  IpsController,
} from './ips.controller';

import {
  IpsService,
} from './ips.service';

@Module({
  controllers: [
    IpsController,
  ],

  providers: [
    IpsService,
  ],
})
export class IpsModule {}
