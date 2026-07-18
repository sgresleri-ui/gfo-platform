import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import {
  createReadStream,
  type ReadStream,
} from 'node:fs';

import {
  chmod,
  mkdir,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';

import {
  createHash,
  randomUUID,
} from 'node:crypto';

import { homedir } from 'node:os';

import {
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';

const MAX_FILE_SIZE =
  25 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  new Set([
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.csv',
    '.txt',
  ]);

const ALLOWED_MIME_TYPES =
  new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'application/octet-stream',
  ]);

export type StoredDocumentFile = {
  stream: ReadStream;
  fileName: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class DocumentFilesService {
  private readonly prisma =
    new PrismaClient();

  private readonly storageRoot =
    resolve(
      process.env.GFO_DOCUMENTS_DIR?.trim() ||
        join(
          homedir(),
          'Documents',
          'GFO-Document-Archive',
        ),
    );

  private async ensureStorageRoot() {
    await mkdir(
      this.storageRoot,
      {
        recursive: true,
        mode: 0o700,
      },
    );

    await chmod(
      this.storageRoot,
      0o700,
    );
  }

  private isManagedPath(
    filePath: string,
  ): boolean {
    const resolvedPath =
      resolve(filePath);

    const pathDifference =
      relative(
        this.storageRoot,
        resolvedPath,
      );

    return (
      pathDifference !== '' &&
      !pathDifference.startsWith('..') &&
      !isAbsolute(pathDifference)
    );
  }

  private validateFile(
    file:
      | Express.Multer.File
      | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        'Nessun file ricevuto.',
      );
    }

    if (
      file.size <= 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      throw new BadRequestException(
        'Il file deve avere una dimensione compresa tra 1 byte e 25 MB.',
      );
    }

    const extension =
      extname(
        file.originalname,
      ).toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.has(
        extension,
      )
    ) {
      throw new BadRequestException(
        'Formato file non supportato.',
      );
    }

    if (
      !ALLOWED_MIME_TYPES.has(
        file.mimetype,
      )
    ) {
      throw new BadRequestException(
        'Tipo MIME non supportato.',
      );
    }
  }

  async attachFile(
    documentId: string,
    file:
      | Express.Multer.File
      | undefined,
  ) {
    this.validateFile(file);

    const document =
      await this.prisma.documentRecord.findUnique(
        {
          where: {
            id: documentId,
          },
        },
      );

    if (!document) {
      throw new NotFoundException(
        'Documento non trovato.',
      );
    }

    await this.ensureStorageRoot();

    const extension =
      extname(
        file.originalname,
      ).toLowerCase();

    const storedFileName =
      `${documentId}-${Date.now()}-${randomUUID()}${extension}`;

    const targetPath =
      join(
        this.storageRoot,
        storedFileName,
      );

    const checksum =
      createHash('sha256')
        .update(file.buffer)
        .digest('hex');

    try {
      await writeFile(
        targetPath,
        file.buffer,
        {
          mode: 0o600,
          flag: 'wx',
        },
      );

      const updated =
        await this.prisma.documentRecord.update(
          {
            where: {
              id: documentId,
            },
            data: {
              fileName:
                file.originalname,
              filePath:
                targetPath,
              mimeType:
                file.mimetype,
              fileSize:
                file.size,
              checksum,
            },
            include: {
              links: true,
            },
          },
        );

      if (
        document.filePath &&
        document.filePath !==
          targetPath &&
        this.isManagedPath(
          document.filePath,
        )
      ) {
        await unlink(
          document.filePath,
        ).catch(() => undefined);
      }

      return {
        id: updated.id,
        fileName:
          updated.fileName,
        mimeType:
          updated.mimeType,
        fileSize:
          updated.fileSize,
        checksum:
          updated.checksum,
        updatedAt:
          updated.updatedAt.toISOString(),
      };
    } catch (error) {
      await unlink(
        targetPath,
      ).catch(() => undefined);

      throw error;
    }
  }

  async openFile(
    documentId: string,
  ): Promise<StoredDocumentFile> {
    const document =
      await this.prisma.documentRecord.findUnique(
        {
          where: {
            id: documentId,
          },
        },
      );

    if (
      !document ||
      !document.filePath ||
      !document.fileName
    ) {
      throw new NotFoundException(
        'File del documento non disponibile.',
      );
    }

    if (
      !this.isManagedPath(
        document.filePath,
      )
    ) {
      throw new BadRequestException(
        'Il file non appartiene all’archivio gestito.',
      );
    }

    let fileStats;

    try {
      fileStats =
        await stat(
          document.filePath,
        );
    } catch {
      throw new NotFoundException(
        'File non trovato nell’archivio locale.',
      );
    }

    if (!fileStats.isFile()) {
      throw new NotFoundException(
        'Il percorso registrato non identifica un file.',
      );
    }

    return {
      stream:
        createReadStream(
          document.filePath,
        ),
      fileName:
        document.fileName,
      mimeType:
        document.mimeType ||
        'application/octet-stream',
      size:
        fileStats.size,
    };
  }

  async removeFile(
    documentId: string,
  ) {
    const document =
      await this.prisma.documentRecord.findUnique(
        {
          where: {
            id: documentId,
          },
        },
      );

    if (!document) {
      throw new NotFoundException(
        'Documento non trovato.',
      );
    }

    const hadFile =
      Boolean(
        document.fileName ||
        document.filePath,
      );

    let physicalFileDeleted = false;

    if (
      document.filePath &&
      this.isManagedPath(
        document.filePath,
      )
    ) {
      try {
        await unlink(
          document.filePath,
        );

        physicalFileDeleted = true;
      } catch (error) {
        const errorCode =
          (
            error as NodeJS.ErrnoException
          ).code;

        if (errorCode !== 'ENOENT') {
          throw error;
        }
      }
    }

    const updated =
      await this.prisma.documentRecord.update(
        {
          where: {
            id: documentId,
          },
          data: {
            fileName: null,
            filePath: null,
            mimeType: null,
            fileSize: null,
            checksum: null,
          },
        },
      );

    return {
      id: updated.id,
      fileRemoved: hadFile,
      physicalFileDeleted,
      updatedAt:
        updated.updatedAt.toISOString(),
    };
  }

  async deleteDocument(
    documentId: string,
  ) {
    const document =
      await this.prisma.documentRecord.findUnique(
        {
          where: {
            id: documentId,
          },
        },
      );

    if (!document) {
      throw new NotFoundException(
        'Documento non trovato.',
      );
    }

    await this.prisma.documentRecord.delete(
      {
        where: {
          id: documentId,
        },
      },
    );

    let physicalFileDeleted = false;
    let warning: string | null = null;

    if (document.filePath) {
      if (
        this.isManagedPath(
          document.filePath,
        )
      ) {
        try {
          await unlink(
            document.filePath,
          );

          physicalFileDeleted = true;
        } catch (error) {
          const errorCode =
            (
              error as NodeJS.ErrnoException
            ).code;

          if (errorCode !== 'ENOENT') {
            warning =
              'Record eliminato, ma il file fisico non è stato cancellato.';
          }
        }
      } else {
        warning =
          'Record eliminato. Il percorso esterno non è stato cancellato.';
      }
    }

    return {
      id: documentId,
      deleted: true,
      physicalFileDeleted,
      warning,
    };
  }

}
