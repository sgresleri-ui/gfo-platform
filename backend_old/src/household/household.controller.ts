import { Controller, Get } from '@nestjs/common';
import { HouseholdService } from './household.service';

@Controller('household')
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  @Get()
  getHousehold() {
    return this.householdService.findFirst();
  }
}