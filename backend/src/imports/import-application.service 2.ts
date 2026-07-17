import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  PrismaClient,
} from '@prisma/client';

import {
  captureNetWorthSnapshot,
} from '../ledger/net-worth-snapshot';

import {
  ImportComparisonService,
  type WorkbookPosition,
} from './import-comparison.service';

type StoredPosition =
  Record<string, unknown>;

@Injectable()
export class ImportApplicationService {
  private readonly prisma =
    new PrismaClient();

  constructor(
    private readonly comparisonService:
      ImportComparisonService,
  ) {}

  private round(value: number): number {
    return (
      Math.round(
        (value + Number.EPSILON) * 100,
      ) / 100
    );
  }

  private parseJson(
    value: string,
  ): Record<string, unknown> {
    try {
      const parsed: unknown =
        JSON.parse(value);

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<
          string,
          unknown
        >;
      }

      return {};
    } catch {
      return {};
    }
  }

  private serializePositions(
    positions: unknown[],
  ): string {
    return JSON.stringify(positions);
  }

  private restoreDates(
    position: StoredPosition,
  ): StoredPosition {
    const restored = {
      ...position,
    };

    const dateFields = [
      'valuationDate',
      'createdAt',
      'updatedAt',
    ];

    for (const field of dateFields) {
      const value = restored[field];

      if (
        typeof value === 'string' &&
        value.length > 0
      ) {
        restored[field] =
          new Date(value);
      }
    }

    return restored;
  }

  async getSnapshots() {
    const snapshots =
      await this.prisma.wealthSnapshot.findMany(
        {
          orderBy: {
            createdAt: 'desc',
          },

          take: 25,
        },
      );

    return {
      count: snapshots.length,

      snapshots: snapshots.map(
        (snapshot) => ({
          id: snapshot.id,
          snapshotType:
            snapshot.snapshotType,
          reason: snapshot.reason,
          sourceRunId:
            snapshot.sourceRunId,
          activePositions:
            snapshot.activePositions,
          archivedPositions:
            snapshot.archivedPositions,
          netValue: snapshot.netValue,

          createdAt:
            snapshot.createdAt.toISOString(),

          restoredAt:
            snapshot.restoredAt?.toISOString() ??
            null,
        }),
      ),
    };
  }

  async applyImport(
    confirmed: boolean,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'L’importazione richiede conferma esplicita.',
      );
    }

    const comparisonResult =
      await this.comparisonService.compareWorkbook();

    const comparison =
      comparisonResult.comparison;

    const run =
      await this.prisma.importRun.findUnique({
        where: {
          id: comparisonResult.runId,
        },
      });

    if (!run) {
      throw new NotFoundException(
        'Analisi di importazione non trovata.',
      );
    }

    if (run.status === 'IMPORTED') {
      throw new BadRequestException(
        'Questa analisi è già stata importata.',
      );
    }

    const workbookPositions =
      comparison.items
        .map(
          (item) => item.workbookData,
        )
        .filter(
          (
            position,
          ): position is WorkbookPosition =>
            position !== null,
        );

    if (
      workbookPositions.length !==
      comparison.summary.extractedPositions
    ) {
      throw new BadRequestException(
        'I dati di confronto non sono completi. Ripetere il confronto.',
      );
    }

    const currentPositions =
      await this.prisma.wealthPosition.findMany(
        {
          orderBy: {
            code: 'asc',
          },
        },
      );

    const activePositions =
      currentPositions.filter(
        (position) =>
          position.status === 'ACTIVE',
      ).length;

    const archivedPositions =
      currentPositions.filter(
        (position) =>
          position.status === 'ARCHIVED',
      ).length;

    const netValue = this.round(
      currentPositions
        .filter(
          (position) =>
            position.status === 'ACTIVE',
        )
        .reduce((total, position) => {
          const value = Number(
            position.valueBase,
          );

          return (
            total +
            (position.isLiability
              ? -value
              : value)
          );
        }, 0),
    );

    const workbookCodes =
      workbookPositions.map(
        (position) => position.code,
      );

    const household =
      await this.prisma.household.findFirst({
        orderBy: {
          id: 'asc',
        },

        select: {
          id: true,
        },
      });

    if (!household) {
      throw new BadRequestException(
        'Household principale non trovato nel database.',
      );
    }

    const result =
      await this.prisma.$transaction(
        async (transaction) => {
          const snapshot =
            await transaction.wealthSnapshot.create(
              {
                data: {
                  snapshotType:
                    'PRE_IMPORT',
                  reason:
                    `Snapshot precedente all’importazione ${run.fileName}`,
                  sourceRunId: run.id,

                  positionsJson:
                    this.serializePositions(
                      currentPositions,
                    ),

                  activePositions,
                  archivedPositions,
                  netValue,
                },
              },
            );

          for (
            const position of
            workbookPositions
          ) {
            const valuationDate =
              new Date();

            const data = {
              name: position.name,
              category:
                position.category,
              subcategory:
                position.subcategory,
              country: position.country,
              currency:
                position.currency,
              valueBase:
                position.valueBase,
              source: position.source,
              status: 'ACTIVE',
              isLiability:
                position.category ===
                'LIABILITY',
              valuationDate,
            };

            await transaction.wealthPosition.upsert(
              {
                where: {
                  code: position.code,
                },

                update: data,

                create: {
                  code: position.code,
                  householdId: household.id,
                  ...data,
                },
              },
            );
          }

          const archivedResult =
            await transaction.wealthPosition.updateMany(
              {
                where: {
                  source:
                    'EXCEL_GRESLERI2026',
                  status: 'ACTIVE',

                  code: {
                    notIn: workbookCodes,
                  },
                },

                data: {
                  status: 'ARCHIVED',
                },
              },
            );

          const historyCapture =
            await captureNetWorthSnapshot(
              transaction,
              {
                householdId:
                  household.id,

                source:
                  'EXCEL_IMPORT',

                importRunId:
                  run.id,

                snapshotDate:
                  new Date(),
              },
            );

          const existingPreview =
            this.parseJson(
              run.previewJson,
            );

          const importSummary = {
            importedAt:
              new Date().toISOString(),

            snapshotId: snapshot.id,

            appliedPositions:
              workbookPositions.length,

            unchanged:
              comparison.summary.unchanged,

            modified:
              comparison.summary.modified,

            created:
              comparison.summary.new,

            archived:
              archivedResult.count,

            protectedManual:
              comparison.summary
                .protectedManual,

            valueDifference:
              comparison.summary
                .valueDifference,

            historySnapshotId:
              historyCapture
                .snapshot.id,

            historySnapshotCreated:
              historyCapture.created,

            historyValuations:
              historyCapture
                .valuationsCreated,
          };

          await transaction.importRun.update({
            where: {
              id: run.id,
            },

            data: {
              status: 'IMPORTED',

              previewJson:
                JSON.stringify({
                  ...existingPreview,
                  import: importSummary,
                }),

              completedAt:
                new Date(),
            },
          });

          return {
            runId: run.id,
            status: 'IMPORTED',
            snapshotId: snapshot.id,
            summary: importSummary,
          };
        },
        {
          timeout: 20000,
        },
      );

    return result;
  }

  async rollbackImport(
    runId: string,
    confirmed: boolean,
  ) {
    if (!confirmed) {
      throw new BadRequestException(
        'Il rollback richiede conferma esplicita.',
      );
    }

    const run =
      await this.prisma.importRun.findUnique({
        where: {
          id: runId,
        },
      });

    if (!run) {
      throw new NotFoundException(
        'Importazione non trovata.',
      );
    }

    if (run.status !== 'IMPORTED') {
      throw new BadRequestException(
        'È possibile annullare soltanto un’importazione completata.',
      );
    }

    const preview =
      this.parseJson(run.previewJson);

    const importData =
      preview.import;

    if (
      typeof importData !== 'object' ||
      importData === null ||
      Array.isArray(importData)
    ) {
      throw new BadRequestException(
        'Snapshot associato non disponibile.',
      );
    }

    const snapshotId =
      (
        importData as Record<
          string,
          unknown
        >
      ).snapshotId;

    if (typeof snapshotId !== 'string') {
      throw new BadRequestException(
        'Identificativo snapshot non valido.',
      );
    }

    const snapshot =
      await this.prisma.wealthSnapshot.findUnique(
        {
          where: {
            id: snapshotId,
          },
        },
      );

    if (!snapshot) {
      throw new NotFoundException(
        'Snapshot di ripristino non trovato.',
      );
    }

    const parsed: unknown =
      JSON.parse(
        snapshot.positionsJson,
      );

    if (!Array.isArray(parsed)) {
      throw new BadRequestException(
        'Contenuto dello snapshot non valido.',
      );
    }

    const restoredPositions =
      parsed.map((position) => {
        if (
          typeof position !== 'object' ||
          position === null ||
          Array.isArray(position)
        ) {
          throw new BadRequestException(
            'Posizione snapshot non valida.',
          );
        }

        return this.restoreDates(
          position as StoredPosition,
        );
      });

    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.wealthPosition.deleteMany(
          {},
        );

        await transaction.wealthPosition.createMany(
          {
            data:
              restoredPositions as unknown as Prisma.WealthPositionCreateManyInput[],
          },
        );

        await transaction.wealthSnapshot.update({
          where: {
            id: snapshot.id,
          },

          data: {
            restoredAt: new Date(),
          },
        });

        await transaction.importRun.update({
          where: {
            id: run.id,
          },

          data: {
            status: 'ROLLED_BACK',

            previewJson:
              JSON.stringify({
                ...preview,

                rollback: {
                  restoredAt:
                    new Date().toISOString(),

                  snapshotId:
                    snapshot.id,

                  restoredPositions:
                    restoredPositions.length,
                },
              }),

            completedAt:
              new Date(),
          },
        });
      },
      {
        timeout: 20000,
      },
    );

    return {
      runId: run.id,
      status: 'ROLLED_BACK',
      snapshotId: snapshot.id,

      restoredPositions:
        restoredPositions.length,
    };
  }
}
