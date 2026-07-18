import { Module } from '@nestjs/common';

import { DocumentFilesService } from './document-files.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentFilesService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
