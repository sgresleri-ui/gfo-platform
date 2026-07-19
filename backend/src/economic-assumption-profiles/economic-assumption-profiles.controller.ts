import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  EconomicAssumptionProfilesService,
} from './economic-assumption-profiles.service';

import type {
  EconomicAssumptionProfileInput,
} from './economic-assumption-profiles.service';

@Controller('economic-assumption-profiles')
export class EconomicAssumptionProfilesController {
  constructor(
    private readonly service:
      EconomicAssumptionProfilesService,
  ) {}

  @Get()
  listProfiles(
    @Query('includeArchived')
    includeArchived?: string,
  ) {
    return this.service.listProfiles(
      includeArchived === 'true',
    );
  }

  @Get(':id')
  getProfile(
    @Param('id')
    id: string,
  ) {
    return this.service.getProfile(id);
  }

  @Post()
  createProfile(
    @Body()
    input:
      EconomicAssumptionProfileInput,
  ) {
    return this.service
      .createProfile(input);
  }

  @Patch(':id')
  updateProfile(
    @Param('id')
    id: string,

    @Body()
    input:
      Partial<EconomicAssumptionProfileInput>,
  ) {
    return this.service
      .updateProfile(id, input);
  }

  @Patch(':id/default')
  setDefaultProfile(
    @Param('id')
    id: string,
  ) {
    return this.service
      .setDefaultProfile(id);
  }

  @Patch(':id/archive')
  archiveProfile(
    @Param('id')
    id: string,
  ) {
    return this.service
      .archiveProfile(id);
  }
}
