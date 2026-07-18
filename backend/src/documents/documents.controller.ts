import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  DocumentFilesService,
} from './document-files.service';

import {
  DocumentsService,
  type CreateDocumentInput,
  type CreateDocumentLinkInput,
  type UpdateDocumentInput,
} from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService:
      DocumentsService,

    private readonly documentFilesService:
      DocumentFilesService,
  ) {}

  @Get()
  getOverview() {
    return this.documentsService.getOverview();
  }

  @Post()
  createDocument(
    @Body() input: CreateDocumentInput,
  ) {
    return this.documentsService.createDocument(
      input,
    );
  }

  @Post(':id/file')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        limits: {
          fileSize:
            25 * 1024 * 1024,
          files: 1,
        },
      },
    ),
  )
  uploadFile(
    @Param('id') id: string,

    @UploadedFile()
    file:
      | Express.Multer.File
      | undefined,
  ) {
    return this.documentFilesService.attachFile(
      id,
      file,
    );
  }

  @Get(':id/file')
  async openFile(
    @Param('id') id: string,
  ) {
    const file =
      await this.documentFilesService.openFile(
        id,
      );

    const encodedFileName =
      encodeURIComponent(
        file.fileName,
      );

    return new StreamableFile(
      file.stream,
      {
        type: file.mimeType,
        length: file.size,
        disposition:
          `inline; filename*=UTF-8''${encodedFileName}`,
      },
    );
  }


  @Delete(':id/file')
  removeFile(
    @Param('id') id: string,
  ) {
    return this.documentFilesService.removeFile(
      id,
    );
  }

  @Delete(':id')
  deleteDocument(
    @Param('id') id: string,
  ) {
    return this.documentFilesService.deleteDocument(
      id,
    );
  }

  @Patch(':id')
  updateDocument(
    @Param('id') id: string,
    @Body() input: UpdateDocumentInput,
  ) {
    return this.documentsService.updateDocument(
      id,
      input,
    );
  }


  @Delete(':id/links/:linkId')
  deleteLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
  ) {
    return this.documentsService.deleteLink(
      id,
      linkId,
    );
  }

  @Post(':id/links')
  createLink(
    @Param('id') id: string,
    @Body() input: CreateDocumentLinkInput,
  ) {
    return this.documentsService.createLink(
      id,
      input,
    );
  }
}
