import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

type SourceStatus =
  | 'HEALTHY'
  | 'WARNING'
  | 'ERROR';

type QualityStatus =
  | 'PASS'
  | 'WARNING'
  | 'FAIL';

type QualityCheck = {
  id: string;
  title: string;
  status: QualityStatus;
  message: string;
  count: number | null;
};

@Injectable()
export class DataCatalogService {
  private readonly prisma = new PrismaClient();

  private getWorkbookPath(): string {
    return path.join(
      process.cwd(),
      '..',
      'data',
      'Gresleri2026.xlsm',
    );
  }

  private getDatabasePath(): string {
    return path.join(
      process.cwd(),
      'prisma',
      'gfo.db',
    );
  }

  private daysSince(date: Date): number {
    const milliseconds =
      Date.now() - date.getTime();

    return Math.max(
      0,
      Math.floor(
        milliseconds /
          (1000 * 60 * 60 * 24),
      ),
    );
  }

  async getOverview() {
    const generatedAt = new Date();

    const positions =
      await this.prisma.wealthPosition.findMany(
        {
          select: {
            code: true,
            category: true,
            status: true,
            source: true,
            country: true,
            isLiability: true,
            valuationDate: true,
          },
        },
      );

    const platformSetting =
      await this.prisma.platformSetting.findUnique(
        {
          where: {
            id: 1,
          },

          select: {
            id: true,
            updatedAt: true,
          },
        },
      );

    const decisions =
      await this.prisma.decisionLogEntry.findMany(
        {
          select: {
            id: true,
            createdAt: true,
            decisionDate: true,
          },
        },
      );

    const activePositions = positions.filter(
      (position) =>
        position.status === 'ACTIVE',
    );

    const archivedPositions = positions.filter(
      (position) =>
        position.status === 'ARCHIVED',
    );

    const categoryMap =
      new Map<string, number>();

    const originMap =
      new Map<string, number>();

    for (const position of activePositions) {
      categoryMap.set(
        position.category,
        (categoryMap.get(
          position.category,
        ) ?? 0) + 1,
      );

      originMap.set(
        position.source,
        (originMap.get(
          position.source,
        ) ?? 0) + 1,
      );
    }

    const categories = Array.from(
      categoryMap.entries(),
    )
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort(
        (first, second) =>
          second.count - first.count,
      );

    const origins = Array.from(
      originMap.entries(),
    )
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort(
        (first, second) =>
          second.count - first.count,
      );

    const activeCodeCounts =
      new Map<string, number>();

    for (const position of activePositions) {
      activeCodeCounts.set(
        position.code,
        (activeCodeCounts.get(
          position.code,
        ) ?? 0) + 1,
      );
    }

    const duplicateCodes = Array.from(
      activeCodeCounts.entries(),
    ).filter(([, count]) => count > 1);

    const activeProvisionalPositions =
      activePositions.filter((position) =>
        position.source.startsWith(
          'PROVISIONAL',
        ),
      );

    const realEstateWithoutCountry =
      activePositions.filter(
        (position) =>
          position.category ===
            'REAL_ESTATE' &&
          !position.country,
      );

    const latestValuationDate =
      activePositions.reduce<Date | null>(
        (latest, position) => {
          if (
            latest === null ||
            position.valuationDate > latest
          ) {
            return position.valuationDate;
          }

          return latest;
        },
        null,
      );

    const latestDecisionDate =
      decisions.reduce<Date | null>(
        (latest, decision) => {
          if (
            latest === null ||
            decision.createdAt > latest
          ) {
            return decision.createdAt;
          }

          return latest;
        },
        null,
      );

    const workbookPath =
      this.getWorkbookPath();

    const databasePath =
      this.getDatabasePath();

    const workbookExists =
      fs.existsSync(workbookPath);

    const databaseExists =
      fs.existsSync(databasePath);

    let workbookSheets: string[] = [];
    let workbookError: string | null = null;
    let workbookUpdatedAt: Date | null = null;
    let workbookSizeBytes: number | null = null;

    if (workbookExists) {
      const statistics =
        fs.statSync(workbookPath);

      workbookUpdatedAt =
        statistics.mtime;

      workbookSizeBytes =
        statistics.size;

      try {
        const workbook =
          new ExcelJS.Workbook();

        await workbook.xlsx.readFile(
          workbookPath,
        );

        workbookSheets =
          workbook.worksheets.map(
            (sheet) => sheet.name,
          );
      } catch (error) {
        workbookError =
          error instanceof Error
            ? error.message
            : 'Errore lettura workbook';
      }
    }

    const workbookAgeDays =
      workbookUpdatedAt
        ? this.daysSince(
            workbookUpdatedAt,
          )
        : null;

    const qualityChecks: QualityCheck[] = [
      {
        id: 'active-positions',
        title:
          'Registro patrimoniale attivo',
        status:
          activePositions.length > 0
            ? 'PASS'
            : 'FAIL',
        message:
          activePositions.length > 0
            ? `${activePositions.length} posizioni attive disponibili.`
            : 'Nessuna posizione patrimoniale attiva.',
        count: activePositions.length,
      },
      {
        id: 'duplicate-codes',
        title:
          'Unicità dei codici patrimoniali',
        status:
          duplicateCodes.length === 0
            ? 'PASS'
            : 'FAIL',
        message:
          duplicateCodes.length === 0
            ? 'Nessun codice attivo duplicato.'
            : `${duplicateCodes.length} codici attivi duplicati.`,
        count: duplicateCodes.length,
      },
      {
        id: 'provisional-active',
        title:
          'Posizioni provvisorie attive',
        status:
          activeProvisionalPositions.length ===
          0
            ? 'PASS'
            : 'WARNING',
        message:
          activeProvisionalPositions.length ===
          0
            ? 'Nessuna posizione provvisoria attiva.'
            : `${activeProvisionalPositions.length} posizioni provvisorie richiedono verifica.`,
        count:
          activeProvisionalPositions.length,
      },
      {
        id: 'real-estate-country',
        title:
          'Paese degli immobili',
        status:
          realEstateWithoutCountry.length === 0
            ? 'PASS'
            : 'WARNING',
        message:
          realEstateWithoutCountry.length === 0
            ? 'Tutti gli immobili hanno un paese associato.'
            : `${realEstateWithoutCountry.length} immobili senza paese.`,
        count:
          realEstateWithoutCountry.length,
      },
      {
        id: 'workbook-available',
        title:
          'Disponibilità workbook Excel',
        status:
          workbookExists &&
          !workbookError
            ? 'PASS'
            : 'FAIL',
        message:
          workbookExists &&
          !workbookError
            ? `${workbookSheets.length} fogli Excel rilevati.`
            : workbookError ??
              'Workbook non trovato.',
        count: workbookSheets.length,
      },
      {
        id: 'workbook-freshness',
        title:
          'Aggiornamento workbook',
        status:
          workbookAgeDays === null
            ? 'FAIL'
            : workbookAgeDays <= 30
              ? 'PASS'
              : 'WARNING',
        message:
          workbookAgeDays === null
            ? 'Data di aggiornamento non disponibile.'
            : `Workbook aggiornato ${workbookAgeDays} giorni fa.`,
        count: workbookAgeDays,
      },
      {
        id: 'settings-record',
        title:
          'Configurazione centrale',
        status: platformSetting
          ? 'PASS'
          : 'FAIL',
        message: platformSetting
          ? 'Impostazioni presenti nel database.'
          : 'Configurazione centrale non trovata.',
        count: platformSetting ? 1 : 0,
      },
      {
        id: 'decision-register',
        title:
          'Registro decisioni',
        status:
          decisions.length > 0
            ? 'PASS'
            : 'WARNING',
        message:
          decisions.length > 0
            ? `${decisions.length} decisioni registrate.`
            : 'Nessuna decisione registrata.',
        count: decisions.length,
      },
    ];

    const failedChecks =
      qualityChecks.filter(
        (check) =>
          check.status === 'FAIL',
      ).length;

    const warningChecks =
      qualityChecks.filter(
        (check) =>
          check.status === 'WARNING',
      ).length;

    const qualityScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          failedChecks * 20 -
          warningChecks * 8,
      ),
    );

    const workbookStatus: SourceStatus =
      !workbookExists || workbookError
        ? 'ERROR'
        : workbookAgeDays !== null &&
            workbookAgeDays > 30
          ? 'WARNING'
          : 'HEALTHY';

    const wealthStatus: SourceStatus =
      activePositions.length === 0
        ? 'ERROR'
        : duplicateCodes.length > 0 ||
            activeProvisionalPositions.length >
              0
          ? 'WARNING'
          : 'HEALTHY';

    const sources = [
      {
        id: 'sqlite-database',
        name: 'Database SQLite',
        type: 'DATABASE',
        status: databaseExists
          ? 'HEALTHY'
          : 'ERROR',
        location:
          'backend/prisma/gfo.db',
        lastUpdated: databaseExists
          ? fs
              .statSync(databasePath)
              .mtime.toISOString()
          : null,
        records: positions.length,
        description:
          'Database centrale Prisma della GFO Platform.',
      },
      {
        id: 'excel-workbook',
        name: 'Gresleri2026.xlsm',
        type: 'WORKBOOK',
        status: workbookStatus,
        location:
          'data/Gresleri2026.xlsm',
        lastUpdated:
          workbookUpdatedAt?.toISOString() ??
          null,
        records: workbookSheets.length,
        description:
          workbookError ??
          `${workbookSheets.length} fogli disponibili · ${workbookSizeBytes ?? 0} byte.`,
      },
      {
        id: 'wealth-register',
        name: 'Registro patrimoniale',
        type: 'DATASET',
        status: wealthStatus,
        location:
          'WealthPosition',
        lastUpdated:
          latestValuationDate?.toISOString() ??
          null,
        records: activePositions.length,
        description:
          `${archivedPositions.length} posizioni archiviate escluse dai totali.`,
      },
      {
        id: 'decision-register',
        name: 'Registro decisioni',
        type: 'DATASET',
        status:
          decisions.length > 0
            ? 'HEALTHY'
            : 'WARNING',
        location:
          'DecisionLogEntry',
        lastUpdated:
          latestDecisionDate?.toISOString() ??
          null,
        records: decisions.length,
        description:
          'Registro strategico append-only.',
      },
      {
        id: 'platform-settings',
        name: 'Impostazioni piattaforma',
        type: 'CONFIGURATION',
        status: platformSetting
          ? 'HEALTHY'
          : 'ERROR',
        location:
          'PlatformSetting',
        lastUpdated:
          platformSetting?.updatedAt.toISOString() ??
          null,
        records: platformSetting ? 1 : 0,
        description:
          'Configurazione persistente del Family Office.',
      },
    ];

    const healthySources =
      sources.filter(
        (source) =>
          source.status === 'HEALTHY',
      ).length;

    const warningSources =
      sources.filter(
        (source) =>
          source.status === 'WARNING',
      ).length;

    const errorSources =
      sources.filter(
        (source) =>
          source.status === 'ERROR',
      ).length;

    return {
      generatedAt:
        generatedAt.toISOString(),

      summary: {
        sourceCount: sources.length,
        healthySources,
        warningSources,
        errorSources,
        activePositions:
          activePositions.length,
        archivedPositions:
          archivedPositions.length,
        decisionEntries:
          decisions.length,
        qualityScore,
        latestValuationDate:
          latestValuationDate?.toISOString() ??
          null,
      },

      categories,
      origins,
      sources,
      qualityChecks,
    };
  }
}
