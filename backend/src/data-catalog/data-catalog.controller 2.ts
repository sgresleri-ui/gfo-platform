import {
  Controller,
  Get,
} from '@nestjs/common';

import { DataCatalogService } from './data-catalog.service';

@Controller('data-catalog')
export class DataCatalogController {
  constructor(
    private readonly dataCatalogService:
      DataCatalogService,
  ) {}

  @Get()
  getOverview() {
    return this.dataCatalogService.getOverview();
  }
}
