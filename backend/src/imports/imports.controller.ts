import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService:
      ImportsService,
  ) {}

  @Get()
  getHistory() {
    return this.importsService.getHistory();
  }

  @Get('status')
  getStatus() {
    return this.importsService.getStatus();
  }

  @Post('preview')
  createPreview() {
    return this.importsService.createPreview();
  }
}
