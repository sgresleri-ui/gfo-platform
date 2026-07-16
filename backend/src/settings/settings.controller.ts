import {
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';

import {
  PlatformSettingsInput,
  SettingsService,
} from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  updateSettings(
    @Body()
    input: Partial<PlatformSettingsInput>,
  ) {
    return this.settingsService.updateSettings(
      input,
    );
  }

  @Put('reset')
  resetSettings() {
    return this.settingsService.resetSettings();
  }
}
