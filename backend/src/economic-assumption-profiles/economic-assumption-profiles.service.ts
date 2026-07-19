import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type EconomicAssumptionProfileInput = {
  code: string;
  name: string;
  description?: string;
  fiscalResidence?: string;

  liquidityReturnDeltaPct?: number;
  investmentsReturnDeltaPct?: number;
  realEstateReturnDeltaPct?: number;
  otherAssetsReturnDeltaPct?: number;

  liquidityTaxRatePct?: number;
  investmentsTaxRatePct?: number;

  rebalancingCostRatePct?: number;
  rebalancingMinimumCost?: number;

  isDefault?: boolean;
  isArchived?: boolean;
};

@Injectable()
export class EconomicAssumptionProfilesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private normalizeCode(
    value: string,
  ): string {
    const code = String(value ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!code) {
      throw new BadRequestException(
        'Il codice del profilo è obbligatorio.',
      );
    }

    return code;
  }

  private validateNumber(
    value: unknown,
    fallback: number,
    label: string,
    minimum: number,
    maximum: number,
  ): number {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return fallback;
    }

    const parsed = Number(value);

    if (
      !Number.isFinite(parsed) ||
      parsed < minimum ||
      parsed > maximum
    ) {
      throw new BadRequestException(
        `${label} deve essere compreso tra ${minimum} e ${maximum}.`,
      );
    }

    return parsed;
  }

  async listProfiles(
    includeArchived = false,
  ) {
    return this.prisma
      .economicAssumptionProfile
      .findMany({
        where: includeArchived
          ? undefined
          : {
              isArchived: false,
            },

        orderBy: [
          {
            isDefault: 'desc',
          },
          {
            name: 'asc',
          },
        ],
      });
  }

  async getProfile(
    id: string,
  ) {
    const profile =
      await this.prisma
        .economicAssumptionProfile
        .findUnique({
          where: {
            id,
          },
        });

    if (!profile) {
      throw new NotFoundException(
        'Profilo economico non trovato.',
      );
    }

    return profile;
  }

  async createProfile(
    input: EconomicAssumptionProfileInput,
  ) {
    const code =
      this.normalizeCode(input.code);

    const name =
      String(input.name ?? '').trim();

    if (!name) {
      throw new BadRequestException(
        'Il nome del profilo è obbligatorio.',
      );
    }

    const existing =
      await this.prisma
        .economicAssumptionProfile
        .findUnique({
          where: {
            code,
          },
        });

    if (existing) {
      throw new BadRequestException(
        `Esiste già un profilo con codice ${code}.`,
      );
    }

    return this.prisma.$transaction(
      async (transaction) => {
        if (input.isDefault) {
          await transaction
            .economicAssumptionProfile
            .updateMany({
              data: {
                isDefault: false,
              },
            });
        }

        return transaction
          .economicAssumptionProfile
          .create({
            data: {
              code,
              name,

              description:
                input.description?.trim() ??
                '',

              fiscalResidence:
                input.fiscalResidence
                  ?.trim() ||
                'Spain',

              liquidityReturnDeltaPct:
                this.validateNumber(
                  input
                    .liquidityReturnDeltaPct,
                  0,
                  'Rendimento liquidità',
                  -30,
                  30,
                ),

              investmentsReturnDeltaPct:
                this.validateNumber(
                  input
                    .investmentsReturnDeltaPct,
                  0,
                  'Rendimento investimenti',
                  -30,
                  30,
                ),

              realEstateReturnDeltaPct:
                this.validateNumber(
                  input
                    .realEstateReturnDeltaPct,
                  0,
                  'Rendimento immobili',
                  -30,
                  30,
                ),

              otherAssetsReturnDeltaPct:
                this.validateNumber(
                  input
                    .otherAssetsReturnDeltaPct,
                  0,
                  'Rendimento altri attivi',
                  -30,
                  30,
                ),

              liquidityTaxRatePct:
                this.validateNumber(
                  input
                    .liquidityTaxRatePct,
                  0,
                  'Imposta liquidità',
                  0,
                  100,
                ),

              investmentsTaxRatePct:
                this.validateNumber(
                  input
                    .investmentsTaxRatePct,
                  0,
                  'Imposta investimenti',
                  0,
                  100,
                ),

              rebalancingCostRatePct:
                this.validateNumber(
                  input
                    .rebalancingCostRatePct,
                  0,
                  'Costo ribilanciamento',
                  0,
                  10,
                ),

              rebalancingMinimumCost:
                this.validateNumber(
                  input
                    .rebalancingMinimumCost,
                  0,
                  'Costo minimo operazione',
                  0,
                  100000,
                ),

              isDefault:
                input.isDefault ??
                false,

              isArchived:
                input.isArchived ??
                false,
            },
          });
      },
    );
  }

  async updateProfile(
    id: string,
    input:
      Partial<EconomicAssumptionProfileInput>,
  ) {
    const current =
      await this.getProfile(id);

    const code =
      input.code === undefined
        ? current.code
        : this.normalizeCode(
            input.code,
          );

    if (code !== current.code) {
      const duplicate =
        await this.prisma
          .economicAssumptionProfile
          .findUnique({
            where: {
              code,
            },
          });

      if (duplicate) {
        throw new BadRequestException(
          `Esiste già un profilo con codice ${code}.`,
        );
      }
    }

    const name =
      input.name === undefined
        ? current.name
        : input.name.trim();

    if (!name) {
      throw new BadRequestException(
        'Il nome del profilo è obbligatorio.',
      );
    }

    return this.prisma.$transaction(
      async (transaction) => {
        if (input.isDefault === true) {
          await transaction
            .economicAssumptionProfile
            .updateMany({
              data: {
                isDefault: false,
              },
            });
        }

        return transaction
          .economicAssumptionProfile
          .update({
            where: {
              id,
            },

            data: {
              code,
              name,

              description:
                input.description ===
                undefined
                  ? current.description
                  : input.description.trim(),

              fiscalResidence:
                input.fiscalResidence ===
                undefined
                  ? current.fiscalResidence
                  : input
                      .fiscalResidence
                      .trim(),

              liquidityReturnDeltaPct:
                this.validateNumber(
                  input
                    .liquidityReturnDeltaPct,
                  current
                    .liquidityReturnDeltaPct,
                  'Rendimento liquidità',
                  -30,
                  30,
                ),

              investmentsReturnDeltaPct:
                this.validateNumber(
                  input
                    .investmentsReturnDeltaPct,
                  current
                    .investmentsReturnDeltaPct,
                  'Rendimento investimenti',
                  -30,
                  30,
                ),

              realEstateReturnDeltaPct:
                this.validateNumber(
                  input
                    .realEstateReturnDeltaPct,
                  current
                    .realEstateReturnDeltaPct,
                  'Rendimento immobili',
                  -30,
                  30,
                ),

              otherAssetsReturnDeltaPct:
                this.validateNumber(
                  input
                    .otherAssetsReturnDeltaPct,
                  current
                    .otherAssetsReturnDeltaPct,
                  'Rendimento altri attivi',
                  -30,
                  30,
                ),

              liquidityTaxRatePct:
                this.validateNumber(
                  input
                    .liquidityTaxRatePct,
                  current
                    .liquidityTaxRatePct,
                  'Imposta liquidità',
                  0,
                  100,
                ),

              investmentsTaxRatePct:
                this.validateNumber(
                  input
                    .investmentsTaxRatePct,
                  current
                    .investmentsTaxRatePct,
                  'Imposta investimenti',
                  0,
                  100,
                ),

              rebalancingCostRatePct:
                this.validateNumber(
                  input
                    .rebalancingCostRatePct,
                  current
                    .rebalancingCostRatePct,
                  'Costo ribilanciamento',
                  0,
                  10,
                ),

              rebalancingMinimumCost:
                this.validateNumber(
                  input
                    .rebalancingMinimumCost,
                  current
                    .rebalancingMinimumCost,
                  'Costo minimo operazione',
                  0,
                  100000,
                ),

              isDefault:
                input.isDefault ===
                undefined
                  ? current.isDefault
                  : input.isDefault,

              isArchived:
                input.isArchived ===
                undefined
                  ? current.isArchived
                  : input.isArchived,
            },
          });
      },
    );
  }

  async setDefaultProfile(
    id: string,
  ) {
    await this.getProfile(id);

    return this.prisma.$transaction(
      async (transaction) => {
        await transaction
          .economicAssumptionProfile
          .updateMany({
            data: {
              isDefault: false,
            },
          });

        return transaction
          .economicAssumptionProfile
          .update({
            where: {
              id,
            },

            data: {
              isDefault: true,
              isArchived: false,
            },
          });
      },
    );
  }

  async archiveProfile(
    id: string,
  ) {
    const profile =
      await this.getProfile(id);

    if (profile.isDefault) {
      throw new BadRequestException(
        'Il profilo predefinito non può essere archiviato.',
      );
    }

    return this.prisma
      .economicAssumptionProfile
      .update({
        where: {
          id,
        },

        data: {
          isArchived: true,
        },
      });
  }
}
