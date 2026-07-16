import { Module } from '@nestjs/common';

import { DataCatalogController } from './data-catalog.controller';
import { DataCatalogService } from './data-catalog.service';

@Module({
  controllers: [DataCatalogController],
  providers: [DataCatalogService],
})
export class DataCatalogModule {}
