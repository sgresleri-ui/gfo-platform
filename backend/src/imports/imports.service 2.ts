import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import * as ExcelJS from 'exceljs';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type ImportCheckStatus =
  | 'PASS'
  | 'WARNING'
  | 'FAIL';

type ImportCheck = {
  id: string;
  title: string;
  status: ImportCheckStatus;
  message: string;
};

const REQUIRED_SHEETS = [
  'Conto Economico',
  'Portafoglio',
  'Immobili',
  'Budget 27',
  'Budget 27-66',
];

@Injectable()
export class ImportsService {
  private readonly prisma = new PrismaClient();

  private async resolveWorkbookPath() {
    const settings =
      await this.prisma.platformSetting.findUnique({
        where: {
          id: 1,
        },
      });

    const fileName =
      settings?.sourceWorkbook ??
      'Gresleri2026.xlsm';

    const configuredFolder =
      settings?.dataFolder ?? '/data';

    const normalizedFolder =
      configuredFolder.replace(
        /^[/\\]+/,
        '',
      );

    const projectRoot = path.resolve(
      process.cwd(),
      '..',
    );

    const workbookPath = path.join(
      projectRoot,
      normalizedFolder,
      fileName,
    );

    return {
      fileName,
      configuredFolder,
      workbookPath,
    };
  }

  private calculateFileHash(
    filePath: string,
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const hash =
          createHash('sha256');

        const stream =
          fs.createReadStream(filePath);

        stream.on('error', reject);

        stream.on('data', (chunk) => {
          hash.update(chunk);
        });

        stream.on('end', () => {
          resolve(hash.digest('hex'));
        });
      },
    );
  }

  private parsePreviewJson(
    value: string,
  ) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }

  private serializeRun(run: {
    id: string;
    fileName: string;
    filePath: string;
    fileHash: string;
    fileSize: number;
    workbookModifiedAt: Date | null;
    status: string;
    sheetCount: number;
    activePositions: number;
    archivedPositions: number;
    previewJson: string;
    errorMessage: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: run.id,
      fileName: run.fileName,
      filePath: run.filePath,
      fileHash: run.fileHash,
      fileSize: run.fileSize,

      workbookModifiedAt:
        run.workbookModifiedAt?.toISOString() ??
        null,

      status: run.status,
      sheetCount: run.sheetCount,
      activePositions: run.activePositions,
      archivedPositions:
        run.archivedPositions,

      preview:
        this.parsePreviewJson(
          run.previewJson,
        ),

      errorMessage: run.errorMessage,

      createdAt:
        run.createdAt.toISOString(),

      completedAt:
        run.completedAt?.toISOString() ??
        null,
    };
  }

  async getStatus() {
    const {
      fileName,
      configuredFolder,
      workbookPath,
    } = await this.resolveWorkbookPath();

    const exists =
      fs.existsSync(workbookPath);

    if (!exists) {
      return {
        exists: false,
        fileName,
        configuredFolder,
        workbookPath,
        message:
          'Workbook configurato non trovato.',
      };
    }

    const statistics =
      fs.statSync(workbookPath);

    const fileHash =
      await this.calculateFileHash(
        workbookPath,
      );

    const previousRun =
      await this.prisma.importRun.findFirst({
        where: {
          fileHash,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    return {
      exists: true,
      fileName,
      configuredFolder,
      workbookPath,
      fileHash,
      fileSize: statistics.size,

      workbookModifiedAt:
        statistics.mtime.toISOString(),

      alreadyAnalyzed:
        previousRun !== null,

      latestMatchingRun:
        previousRun
          ? this.serializeRun(previousRun)
          : null,
    };
  }

  async getHistory() {
    const runs =
      await this.prisma.importRun.findMany({
        orderBy: {
          createdAt: 'desc',
        },

        take: 25,
      });

    return {
      count: runs.length,

      runs: runs.map((run) =>
        this.serializeRun(run),
      ),
    };
  }

  async createPreview() {
    const {
      fileName,
      workbookPath,
    } = await this.resolveWorkbookPath();

    if (!fs.existsSync(workbookPath)) {
      throw new NotFoundException(
        `Workbook non trovato: ${workbookPath}`,
      );
    }

    const statistics =
      fs.statSync(workbookPath);

    const fileHash =
      await this.calculateFileHash(
        workbookPath,
      );

    const previousCompletedRun =
      await this.prisma.importRun.findFirst({
        where: {
          fileHash,
          status: {
            in: [
              'PREVIEW_READY',
              'IMPORTED',
            ],
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    const positions =
      await this.prisma.wealthPosition.findMany({
        select: {
          status: true,
        },
      });

    const activePositions =
      positions.filter(
        (position) =>
          position.status === 'ACTIVE',
      ).length;

    const archivedPositions =
      positions.filter(
        (position) =>
          position.status === 'ARCHIVED',
      ).length;

    const workbook =
      new ExcelJS.Workbook();

    let sheetNames: string[] = [];

    try {
      await workbook.xlsx.readFile(
        workbookPath,
      );

      sheetNames =
        workbook.worksheets.map(
          (sheet) => sheet.name,
        );
    } catch (error) {
      const failedRun =
        await this.prisma.importRun.create({
          data: {
            fileName,
            filePath: workbookPath,
            fileHash,
            fileSize: statistics.size,
            workbookModifiedAt:
              statistics.mtime,
            status: 'FAILED',
            sheetCount: 0,
            activePositions,
            archivedPositions,
            previewJson: '{}',

            errorMessage:
              error instanceof Error
                ? error.message
                : 'Errore lettura workbook',

            completedAt: new Date(),
          },
        });

      return this.serializeRun(failedRun);
    }

    const missingSheets =
      REQUIRED_SHEETS.filter(
        (requiredSheet) =>
          !sheetNames.includes(
            requiredSheet,
          ),
      );

    const checks: ImportCheck[] = [
      {
        id: 'workbook-readable',
        title: 'Lettura workbook',
        status: 'PASS',
        message:
          'Il workbook è leggibile.',
      },

      {
        id: 'required-sheets',
        title: 'Fogli obbligatori',

        status:
          missingSheets.length === 0
            ? 'PASS'
            : 'FAIL',

        message:
          missingSheets.length === 0
            ? 'Tutti i fogli obbligatori sono presenti.'
            : `Fogli mancanti: ${missingSheets.join(
                ', ',
              )}.`,
      },

      {
        id: 'duplicate-file',
        title: 'Duplicazione file',

        status:
          previousCompletedRun
            ? 'WARNING'
            : 'PASS',

        message:
          previousCompletedRun
            ? 'Questo identico file è già stato analizzato.'
            : 'Nessuna precedente analisi con lo stesso hash.',
      },

      {
        id: 'current-register',
        title:
          'Registro patrimoniale corrente',

        status:
          activePositions > 0
            ? 'PASS'
            : 'WARNING',

        message:
          `${activePositions} posizioni attive e ${archivedPositions} archiviate nel database.`,
      },
    ];

    const blockingErrors =
      checks.filter(
        (check) =>
          check.status === 'FAIL',
      ).length;

    const warnings =
      checks.filter(
        (check) =>
          check.status === 'WARNING',
      ).length;

    const preview = {
      safeToContinue:
        blockingErrors === 0,

      duplicateFile:
        previousCompletedRun !== null,

      previousMatchingRunId:
        previousCompletedRun?.id ?? null,

      sheetNames,
      requiredSheets: REQUIRED_SHEETS,
      missingSheets,

      checks,

      summary: {
        blockingErrors,
        warnings,
        sheetCount: sheetNames.length,
        activePositions,
        archivedPositions,
      },

      nextStep:
        blockingErrors === 0
          ? 'Il workbook può passare alla fase di confronto delle posizioni.'
          : 'Correggere gli errori bloccanti prima di continuare.',
    };

    const run =
      await this.prisma.importRun.create({
        data: {
          fileName,
          filePath: workbookPath,
          fileHash,
          fileSize: statistics.size,

          workbookModifiedAt:
            statistics.mtime,

          status:
            blockingErrors === 0
              ? 'PREVIEW_READY'
              : 'BLOCKED',

          sheetCount: sheetNames.length,
          activePositions,
          archivedPositions,

          previewJson:
            JSON.stringify(preview),

          completedAt: new Date(),
        },
      });

    return this.serializeRun(run);
  }
}
