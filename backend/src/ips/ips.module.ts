import { Module } from '@nestjs/common';

import {
  IpsController,
} from './ips.controller';

import {
  IpsClassificationService,
} from './ips-classification.service';

import {
  IpsService,
} from './ips.service';

@Module({
  controllers: [
    IpsController,
  ],

  providers: [
    IpsService,
    IpsClassificationService,
  ],
})
export class IpsModule {}
