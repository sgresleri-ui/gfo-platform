import { Body, Controller, Get, Put } from '@nestjs/common';

import {
  CapitalAllocationService,
  type UpdateElToroCapitalPlanInput,
} from './capital-allocation.service';

@Controller('capital-allocation')
export class CapitalAllocationController {
  constructor(
    private readonly capitalAllocationService: CapitalAllocationService,
  ) {}

  @Get('el-toro')
  getElToroPlan() {
    return this.capitalAllocationService.getElToroPlan();
  }

  @Put('el-toro')
  updateElToroPlan(
    @Body()
    input: UpdateElToroCapitalPlanInput,
  ) {
    return this.capitalAllocationService.updateElToroPlan(input);
  }
}
