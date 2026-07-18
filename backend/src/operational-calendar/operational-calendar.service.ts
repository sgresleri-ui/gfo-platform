import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  PrismaClient,
} from '@prisma/client';

export type CreateOperationalTaskInput = {
  dueDate: string;
  title: string;
  category: string;
  status?: string;
  priority?: string;
  description: string;
  linkedDocuments?: string[];
  amount?: number | null;
  notes?: string | null;
};

export type UpdateOperationalTaskInput =
  Partial<CreateOperationalTaskInput>;

const VALID_CATEGORIES = [
  'INVESTMENT',
  'REBALANCING',
  'TRANSFER',
  'TAX',
  'INSURANCE',
  'PROPERTY',
  'SUCCESSION',
  'DOCUMENTATION',
  'BANKING',
  'IBKR',
  'FINECO',
  'PLATFORM',
] as const;

const VALID_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'COMPLETED',
  'DEFERRED',
  'CANCELLED',
] as const;

const VALID_PRIORITIES = [
  'HIGH',
  'MEDIUM',
  'LOW',
] as const;

const SEED_TASKS = [
  {
    id: 'operational-el-toro-closing',
    dueDate: new Date(
      '2026-07-31T00:00:00.000Z',
    ),
    title:
      'Perfezionare la vendita dell’immobile El Toro',
    category: 'PROPERTY',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    description:
      'Completare il rogito, verificare l’incasso netto e aggiornare la situazione patrimoniale dopo la vendita.',
    linkedDocumentsJson:
      JSON.stringify([]),
    amount: 2150000,
    notes:
      'L’immobile resta classificato come destinato alla vendita fino al perfezionamento del rogito.',
    source: 'PROJECT_HISTORY',
  },
  {
    id: 'operational-dubai-relocation',
    dueDate: new Date(
      '2026-08-04T00:00:00.000Z',
    ),
    title:
      'Completare il trasferimento familiare a Dubai',
    category: 'TRANSFER',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    description:
      'Coordinare trasferimento, documentazione, rapporti bancari e attività operative collegate al trasferimento familiare.',
    linkedDocumentsJson:
      JSON.stringify([]),
    amount: null,
    notes:
      'La residenza fiscale 2026 resta soggetta alle verifiche previste dal piano internazionale.',
    source: 'PROJECT_HISTORY',
  },
];

@Injectable()
export class OperationalCalendarService {
  private readonly prisma =
    new PrismaClient();

  private parseDate(
    value: string,
  ): Date {
    const trimmed = value.trim();

    const italianMatch =
      trimmed.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
      );

    if (italianMatch) {
      const [, day, month, year] =
        italianMatch;

      return new Date(
        `${year}-${month}-${day}T00:00:00.000Z`,
      );
    }

    const parsed = new Date(trimmed);

    if (
      Number.isNaN(parsed.getTime())
    ) {
      throw new BadRequestException(
        'Data prevista non valida.',
      );
    }

    return parsed;
  }

  private validateAllowedValue(
    value: string,
    allowedValues: readonly string[],
    label: string,
  ): string {
    const normalized =
      value.trim().toUpperCase();

    if (
      !allowedValues.includes(normalized)
    ) {
      throw new BadRequestException(
        `${label} non valido.`,
      );
    }

    return normalized;
  }

  private parseDocuments(
    value: string,
  ): string[] {
    try {
      const parsed: unknown =
        JSON.parse(value);

      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item) =>
            typeof item === 'string',
        )
      ) {
        return parsed;
      }

      return [];
    } catch {
      return [];
    }
  }

  private serializeTask(
    task: {
      id: string;
      householdId: number;
      dueDate: Date;
      title: string;
      category: string;
      status: string;
      priority: string;
      description: string;
      linkedDocumentsJson: string;
      amount: number | null;
      notes: string | null;
      source: string;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    return {
      id: task.id,
      householdId:
        task.householdId,
      dueDate:
        task.dueDate.toISOString(),
      title: task.title,
      category: task.category,
      status: task.status,
      priority: task.priority,
      description:
        task.description,
      linkedDocuments:
        this.parseDocuments(
          task.linkedDocumentsJson,
        ),
      amount: task.amount,
      notes: task.notes,
      source: task.source,
      completedAt:
        task.completedAt?.toISOString() ??
        null,
      createdAt:
        task.createdAt.toISOString(),
      updatedAt:
        task.updatedAt.toISOString(),
    };
  }

  private async getHouseholdId():
    Promise<number> {
    const household =
      await this.prisma.household.findFirst(
        {
          orderBy: {
            id: 'asc',
          },
          select: {
            id: true,
          },
        },
      );

    if (!household) {
      throw new InternalServerErrorException(
        'Household non configurato.',
      );
    }

    return household.id;
  }

  private async ensureSeedTasks() {
    const householdId =
      await this.getHouseholdId();

    for (
      const task of SEED_TASKS
    ) {
      const existing =
        await this.prisma.operationalTask.findUnique(
          {
            where: {
              id: task.id,
            },
            select: {
              id: true,
            },
          },
        );

      if (!existing) {
        await this.prisma.operationalTask.create(
          {
            data: {
              ...task,
              householdId,
            },
          },
        );
      }
    }
  }

  async getOverview() {
    await this.ensureSeedTasks();

    const tasks =
      await this.prisma.operationalTask.findMany(
        {
          orderBy: [
            {
              dueDate: 'asc',
            },
            {
              createdAt: 'desc',
            },
          ],
        },
      );

    const closedStatuses = new Set([
      'COMPLETED',
      'CANCELLED',
    ]);

    const openTasks =
      tasks.filter(
        (task) =>
          !closedStatuses.has(
            task.status,
          ),
      );

    const today = new Date();
    today.setUTCHours(
      0,
      0,
      0,
      0,
    );

    const nextThirtyDays =
      new Date(today);

    nextThirtyDays.setUTCDate(
      nextThirtyDays.getUTCDate() +
        30,
    );

    const overdue =
      openTasks.filter(
        (task) =>
          task.dueDate.getTime() <
          today.getTime(),
      );

    const dueNextThirtyDays =
      openTasks.filter(
        (task) =>
          task.dueDate.getTime() >=
            today.getTime() &&
          task.dueDate.getTime() <=
            nextThirtyDays.getTime(),
      );

    return {
      generatedAt:
        new Date().toISOString(),

      summary: {
        total: tasks.length,

        open: openTasks.length,

        inProgress:
          tasks.filter(
            (task) =>
              task.status ===
              'IN_PROGRESS',
          ).length,

        completed:
          tasks.filter(
            (task) =>
              task.status ===
              'COMPLETED',
          ).length,

        overdue: overdue.length,

        dueNextThirtyDays:
          dueNextThirtyDays.length,

        highPriorityOpen:
          openTasks.filter(
            (task) =>
              task.priority ===
              'HIGH',
          ).length,
      },

      tasks: tasks.map(
        (task) =>
          this.serializeTask(task),
      ),
    };
  }

  async createTask(
    input: CreateOperationalTaskInput,
  ) {
    if (
      !input.title?.trim() ||
      !input.description?.trim() ||
      !input.dueDate?.trim() ||
      !input.category?.trim()
    ) {
      throw new BadRequestException(
        'Data, titolo, categoria e descrizione sono obbligatori.',
      );
    }

    if (
      input.amount !== undefined &&
      input.amount !== null &&
      !Number.isFinite(input.amount)
    ) {
      throw new BadRequestException(
        'Importo non valido.',
      );
    }

    if (
      input.linkedDocuments !==
        undefined &&
      (
        !Array.isArray(
          input.linkedDocuments,
        ) ||
        !input.linkedDocuments.every(
          (item) =>
            typeof item === 'string',
        )
      )
    ) {
      throw new BadRequestException(
        'Documenti collegati non validi.',
      );
    }

    const householdId =
      await this.getHouseholdId();

    const status =
      this.validateAllowedValue(
        input.status ?? 'TODO',
        VALID_STATUSES,
        'Stato',
      );

    const task =
      await this.prisma.operationalTask.create(
        {
          data: {
            householdId,
            dueDate:
              this.parseDate(
                input.dueDate,
              ),
            title:
              input.title.trim(),
            category:
              this.validateAllowedValue(
                input.category,
                VALID_CATEGORIES,
                'Categoria',
              ),
            status,
            priority:
              this.validateAllowedValue(
                input.priority ??
                  'MEDIUM',
                VALID_PRIORITIES,
                'Priorità',
              ),
            description:
              input.description.trim(),
            linkedDocumentsJson:
              JSON.stringify(
                input.linkedDocuments ??
                  [],
              ),
            amount:
              input.amount ?? null,
            notes:
              input.notes?.trim() ||
              null,
            source: 'MANUAL',
            completedAt:
              status === 'COMPLETED'
                ? new Date()
                : null,
          },
        },
      );

    return this.serializeTask(task);
  }

  async updateTask(
    id: string,
    input: UpdateOperationalTaskInput,
  ) {
    const existing =
      await this.prisma.operationalTask.findUnique(
        {
          where: {
            id,
          },
        },
      );

    if (!existing) {
      throw new NotFoundException(
        'Attività non trovata.',
      );
    }

    const data:
      Prisma.OperationalTaskUpdateInput =
      {};

    if (
      input.dueDate !== undefined
    ) {
      data.dueDate =
        this.parseDate(
          input.dueDate,
        );
    }

    if (
      input.title !== undefined
    ) {
      const title =
        input.title.trim();

      if (!title) {
        throw new BadRequestException(
          'Titolo non valido.',
        );
      }

      data.title = title;
    }

    if (
      input.category !== undefined
    ) {
      data.category =
        this.validateAllowedValue(
          input.category,
          VALID_CATEGORIES,
          'Categoria',
        );
    }

    if (
      input.priority !== undefined
    ) {
      data.priority =
        this.validateAllowedValue(
          input.priority,
          VALID_PRIORITIES,
          'Priorità',
        );
    }

    if (
      input.description !==
      undefined
    ) {
      const description =
        input.description.trim();

      if (!description) {
        throw new BadRequestException(
          'Descrizione non valida.',
        );
      }

      data.description =
        description;
    }

    if (
      input.linkedDocuments !==
      undefined
    ) {
      if (
        !Array.isArray(
          input.linkedDocuments,
        ) ||
        !input.linkedDocuments.every(
          (item) =>
            typeof item === 'string',
        )
      ) {
        throw new BadRequestException(
          'Documenti collegati non validi.',
        );
      }

      data.linkedDocumentsJson =
        JSON.stringify(
          input.linkedDocuments,
        );
    }

    if (
      input.amount !== undefined
    ) {
      if (
        input.amount !== null &&
        !Number.isFinite(
          input.amount,
        )
      ) {
        throw new BadRequestException(
          'Importo non valido.',
        );
      }

      data.amount =
        input.amount;
    }

    if (
      input.notes !== undefined
    ) {
      data.notes =
        input.notes?.trim() ||
        null;
    }

    if (
      input.status !== undefined
    ) {
      const status =
        this.validateAllowedValue(
          input.status,
          VALID_STATUSES,
          'Stato',
        );

      data.status = status;

      data.completedAt =
        status === 'COMPLETED'
          ? existing.completedAt ??
            new Date()
          : null;
    }

    const updated =
      await this.prisma.operationalTask.update(
        {
          where: {
            id,
          },
          data,
        },
      );

    return this.serializeTask(updated);
  }
}
