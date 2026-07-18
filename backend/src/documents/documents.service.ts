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

export type CreateDocumentInput = {
  title: string;
  category: string;
  documentType: string;
  status?: string;
  issuer?: string | null;
  country?: string | null;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  checksum?: string | null;
  confidentiality?: string;
  notes?: string | null;
};

export type UpdateDocumentInput =
  Partial<CreateDocumentInput>;

export type CreateDocumentLinkInput = {
  entityType: string;
  entityId: string;
  relationType?: string;
  notes?: string | null;
};

const VALID_CATEGORIES = [
  'BANKING',
  'INVESTMENT',
  'PROPERTY',
  'TAX',
  'INSURANCE',
  'SUCCESSION',
  'IDENTITY',
  'CORPORATE',
  'CONTRACT',
  'PLATFORM',
  'OTHER',
] as const;

const VALID_STATUSES = [
  'ACTIVE',
  'DRAFT',
  'EXPIRED',
  'ARCHIVED',
] as const;

const VALID_CONFIDENTIALITY = [
  'FAMILY',
  'PRIVATE',
  'RESTRICTED',
] as const;

const VALID_ENTITY_TYPES = [
  'HOUSEHOLD',
  'OPERATIONAL_TASK',
  'DECISION',
  'PROPERTY',
  'ACCOUNT',
  'POSITION',
] as const;

const VALID_RELATION_TYPES = [
  'PRIMARY',
  'SUPPORTING',
  'REFERENCE',
] as const;

@Injectable()
export class DocumentsService {
  private readonly prisma =
    new PrismaClient();

  private normalizeAllowedValue(
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

  private parseOptionalDate(
    value: string | null | undefined,
    label: string,
  ): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (
      value === null ||
      value.trim() === ''
    ) {
      return null;
    }

    const trimmed = value.trim();

    const italianMatch =
      trimmed.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
      );

    const parsed = italianMatch
      ? new Date(
          `${italianMatch[3]}-${italianMatch[2]}-${italianMatch[1]}T00:00:00.000Z`,
        )
      : new Date(trimmed);

    if (
      Number.isNaN(parsed.getTime())
    ) {
      throw new BadRequestException(
        `${label} non valida.`,
      );
    }

    return parsed;
  }

  private optionalText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value?.trim() || null;
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

  private serializeDocument(
    document: {
      id: string;
      householdId: number;
      title: string;
      category: string;
      documentType: string;
      status: string;
      issuer: string | null;
      country: string | null;
      documentNumber: string | null;
      issueDate: Date | null;
      expiryDate: Date | null;
      fileName: string | null;
      filePath: string | null;
      mimeType: string | null;
      fileSize: number | null;
      checksum: string | null;
      confidentiality: string;
      notes: string | null;
      source: string;
      createdAt: Date;
      updatedAt: Date;
      links: Array<{
        id: string;
        entityType: string;
        entityId: string;
        relationType: string;
        notes: string | null;
        createdAt: Date;
      }>;
    },
  ) {
    return {
      id: document.id,
      householdId:
        document.householdId,
      title: document.title,
      category: document.category,
      documentType:
        document.documentType,
      status: document.status,
      issuer: document.issuer,
      country: document.country,
      documentNumber:
        document.documentNumber,
      issueDate:
        document.issueDate?.toISOString() ??
        null,
      expiryDate:
        document.expiryDate?.toISOString() ??
        null,
      fileName: document.fileName,
      filePath: document.filePath,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      checksum: document.checksum,
      confidentiality:
        document.confidentiality,
      notes: document.notes,
      source: document.source,
      createdAt:
        document.createdAt.toISOString(),
      updatedAt:
        document.updatedAt.toISOString(),
      links: document.links.map(
        (link) => ({
          ...link,
          createdAt:
            link.createdAt.toISOString(),
        }),
      ),
    };
  }

  async getOverview() {
    const documents =
      await this.prisma.documentRecord.findMany(
        {
          include: {
            links: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: [
            {
              expiryDate: 'asc',
            },
            {
              createdAt: 'desc',
            },
          ],
        },
      );

    const today = new Date();

    today.setUTCHours(
      0,
      0,
      0,
      0,
    );

    const ninetyDays =
      new Date(today);

    ninetyDays.setUTCDate(
      ninetyDays.getUTCDate() + 90,
    );

    const nonArchived =
      documents.filter(
        (document) =>
          document.status !==
          'ARCHIVED',
      );

    const expired =
      nonArchived.filter(
        (document) =>
          document.expiryDate !== null &&
          document.expiryDate.getTime() <
            today.getTime(),
      );

    const expiring =
      nonArchived.filter(
        (document) =>
          document.expiryDate !== null &&
          document.expiryDate.getTime() >=
            today.getTime() &&
          document.expiryDate.getTime() <=
            ninetyDays.getTime(),
      );

    const categories = [
      ...new Set(
        documents.map(
          (document) =>
            document.category,
        ),
      ),
    ]
      .sort()
      .map((category) => ({
        name: category,

        count: documents.filter(
          (document) =>
            document.category ===
            category,
        ).length,
      }));

    return {
      generatedAt:
        new Date().toISOString(),

      summary: {
        total: documents.length,

        active:
          documents.filter(
            (document) =>
              document.status ===
              'ACTIVE',
          ).length,

        draft:
          documents.filter(
            (document) =>
              document.status ===
              'DRAFT',
          ).length,

        archived:
          documents.filter(
            (document) =>
              document.status ===
              'ARCHIVED',
          ).length,

        expired: expired.length,

        expiringWithinNinetyDays:
          expiring.length,

        missingFile:
          documents.filter(
            (document) =>
              !document.fileName ||
              !document.filePath,
          ).length,

        restricted:
          documents.filter(
            (document) =>
              document.confidentiality ===
              'RESTRICTED',
          ).length,

        linked:
          documents.filter(
            (document) =>
              document.links.length > 0,
          ).length,
      },

      categories,

      documents: documents.map(
        (document) =>
          this.serializeDocument(
            document,
          ),
      ),
    };
  }

  async createDocument(
    input: CreateDocumentInput,
  ) {
    if (
      !input.title?.trim() ||
      !input.category?.trim() ||
      !input.documentType?.trim()
    ) {
      throw new BadRequestException(
        'Titolo, categoria e tipo documento sono obbligatori.',
      );
    }

    if (
      input.fileSize !== undefined &&
      input.fileSize !== null &&
      (
        !Number.isInteger(
          input.fileSize,
        ) ||
        input.fileSize < 0
      )
    ) {
      throw new BadRequestException(
        'Dimensione file non valida.',
      );
    }

    const issueDate =
      this.parseOptionalDate(
        input.issueDate,
        'Data emissione',
      );

    const expiryDate =
      this.parseOptionalDate(
        input.expiryDate,
        'Data scadenza',
      );

    if (
      issueDate instanceof Date &&
      expiryDate instanceof Date &&
      expiryDate.getTime() <
        issueDate.getTime()
    ) {
      throw new BadRequestException(
        'La scadenza non può precedere la data di emissione.',
      );
    }

    const householdId =
      await this.getHouseholdId();

    const document =
      await this.prisma.documentRecord.create(
        {
          data: {
            householdId,
            title:
              input.title.trim(),
            category:
              this.normalizeAllowedValue(
                input.category,
                VALID_CATEGORIES,
                'Categoria',
              ),
            documentType:
              input.documentType.trim(),
            status:
              this.normalizeAllowedValue(
                input.status ??
                  'ACTIVE',
                VALID_STATUSES,
                'Stato',
              ),
            issuer:
              this.optionalText(
                input.issuer,
              ),
            country:
              this.optionalText(
                input.country,
              ),
            documentNumber:
              this.optionalText(
                input.documentNumber,
              ),
            issueDate:
              issueDate ?? null,
            expiryDate:
              expiryDate ?? null,
            fileName:
              this.optionalText(
                input.fileName,
              ),
            filePath:
              this.optionalText(
                input.filePath,
              ),
            mimeType:
              this.optionalText(
                input.mimeType,
              ),
            fileSize:
              input.fileSize ?? null,
            checksum:
              this.optionalText(
                input.checksum,
              ),
            confidentiality:
              this.normalizeAllowedValue(
                input.confidentiality ??
                  'PRIVATE',
                VALID_CONFIDENTIALITY,
                'Riservatezza',
              ),
            notes:
              this.optionalText(
                input.notes,
              ),
            source: 'MANUAL',
          },
          include: {
            links: true,
          },
        },
      );

    return this.serializeDocument(
      document,
    );
  }

  async updateDocument(
    id: string,
    input: UpdateDocumentInput,
  ) {
    const existing =
      await this.prisma.documentRecord.findUnique(
        {
          where: {
            id,
          },
        },
      );

    if (!existing) {
      throw new NotFoundException(
        'Documento non trovato.',
      );
    }

    const data:
      Prisma.DocumentRecordUpdateInput =
      {};

    if (
      input.title !== undefined
    ) {
      if (!input.title.trim()) {
        throw new BadRequestException(
          'Titolo non valido.',
        );
      }

      data.title =
        input.title.trim();
    }

    if (
      input.category !== undefined
    ) {
      data.category =
        this.normalizeAllowedValue(
          input.category,
          VALID_CATEGORIES,
          'Categoria',
        );
    }

    if (
      input.documentType !==
      undefined
    ) {
      if (
        !input.documentType.trim()
      ) {
        throw new BadRequestException(
          'Tipo documento non valido.',
        );
      }

      data.documentType =
        input.documentType.trim();
    }

    if (
      input.status !== undefined
    ) {
      data.status =
        this.normalizeAllowedValue(
          input.status,
          VALID_STATUSES,
          'Stato',
        );
    }

    if (
      input.confidentiality !==
      undefined
    ) {
      data.confidentiality =
        this.normalizeAllowedValue(
          input.confidentiality,
          VALID_CONFIDENTIALITY,
          'Riservatezza',
        );
    }

    for (
      const field of [
        'issuer',
        'country',
        'documentNumber',
        'fileName',
        'filePath',
        'mimeType',
        'checksum',
        'notes',
      ] as const
    ) {
      if (
        input[field] !== undefined
      ) {
        data[field] =
          this.optionalText(
            input[field],
          );
      }
    }

    if (
      input.fileSize !== undefined
    ) {
      if (
        input.fileSize !== null &&
        (
          !Number.isInteger(
            input.fileSize,
          ) ||
          input.fileSize < 0
        )
      ) {
        throw new BadRequestException(
          'Dimensione file non valida.',
        );
      }

      data.fileSize =
        input.fileSize;
    }

    if (
      input.issueDate !== undefined
    ) {
      data.issueDate =
        this.parseOptionalDate(
          input.issueDate,
          'Data emissione',
        );
    }

    if (
      input.expiryDate !==
      undefined
    ) {
      data.expiryDate =
        this.parseOptionalDate(
          input.expiryDate,
          'Data scadenza',
        );
    }

    const updated =
      await this.prisma.documentRecord.update(
        {
          where: {
            id,
          },
          data,
          include: {
            links: true,
          },
        },
      );

    return this.serializeDocument(
      updated,
    );
  }

  async createLink(
    documentId: string,
    input: CreateDocumentLinkInput,
  ) {
    const document =
      await this.prisma.documentRecord.findUnique(
        {
          where: {
            id: documentId,
          },
          select: {
            id: true,
          },
        },
      );

    if (!document) {
      throw new NotFoundException(
        'Documento non trovato.',
      );
    }

    if (
      !input.entityType?.trim() ||
      !input.entityId?.trim()
    ) {
      throw new BadRequestException(
        'Tipo e identificativo del collegamento sono obbligatori.',
      );
    }

    const entityType =
      this.normalizeAllowedValue(
        input.entityType,
        VALID_ENTITY_TYPES,
        'Tipo entità',
      );

    const entityId =
      input.entityId.trim();

    const existing =
      await this.prisma.documentLink.findFirst(
        {
          where: {
            documentId,
            entityType,
            entityId,
          },
        },
      );

    if (existing) {
      return {
        ...existing,
        createdAt:
          existing.createdAt.toISOString(),
      };
    }

    const link =
      await this.prisma.documentLink.create(
        {
          data: {
            documentId,
            entityType,
            entityId,
            relationType:
              this.normalizeAllowedValue(
                input.relationType ??
                  'SUPPORTING',
                VALID_RELATION_TYPES,
                'Tipo relazione',
              ),
            notes:
              this.optionalText(
                input.notes,
              ),
          },
        },
      );

    return {
      ...link,
      createdAt:
        link.createdAt.toISOString(),
    };
  }

  async deleteLink(
    documentId: string,
    linkId: string,
  ) {
    const link =
      await this.prisma.documentLink.findFirst(
        {
          where: {
            id: linkId,
            documentId,
          },
        },
      );

    if (!link) {
      throw new NotFoundException(
        'Collegamento documentale non trovato.',
      );
    }

    await this.prisma.documentLink.delete(
      {
        where: {
          id: linkId,
        },
      },
    );

    return {
      id: linkId,
      documentId,
      deleted: true,
    };
  }

}
