import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export type PlatformSettingsInput = {
  householdName: string;
  ownerName: string;
  baseCurrency: string;
  timezone: string;
  fiscalResidence: string;
  plannedFiscalResidence: string;
  sourceWorkbook: string;
  dataFolder: string;
  automaticRefresh: boolean;
  showArchivedPositions: boolean;
  requireDecisionNotes: boolean;
};

const DEFAULT_SETTINGS: PlatformSettingsInput = {
  householdName: 'Family Office – Stefano Gresleri',
  ownerName: 'Stefano Gresleri',
  baseCurrency: 'EUR',
  timezone: 'Europe/Madrid',
  fiscalResidence: 'Spain',
  plannedFiscalResidence: 'United Arab Emirates',
  sourceWorkbook: 'Gresleri2026.xlsm',
  dataFolder: '/data',
  automaticRefresh: true,
  showArchivedPositions: false,
  requireDecisionNotes: true,
};

@Injectable()
export class SettingsService {
  private readonly prisma = new PrismaClient();

  async getSettings() {
    return this.prisma.platformSetting.upsert({
      where: {
        id: 1,
      },

      update: {},

      create: {
        id: 1,
        ...DEFAULT_SETTINGS,
      },
    });
  }

  async updateSettings(
    input: Partial<PlatformSettingsInput>,
  ) {
    const current = await this.getSettings();

    const settings: PlatformSettingsInput = {
      householdName:
        input.householdName?.trim() ||
        current.householdName,

      ownerName:
        input.ownerName?.trim() ||
        current.ownerName,

      baseCurrency:
        input.baseCurrency?.trim() ||
        current.baseCurrency,

      timezone:
        input.timezone?.trim() ||
        current.timezone,

      fiscalResidence:
        input.fiscalResidence?.trim() ||
        current.fiscalResidence,

      plannedFiscalResidence:
        input.plannedFiscalResidence?.trim() ||
        current.plannedFiscalResidence,

      sourceWorkbook:
        input.sourceWorkbook?.trim() ||
        current.sourceWorkbook,

      dataFolder:
        input.dataFolder?.trim() ||
        current.dataFolder,

      automaticRefresh:
        typeof input.automaticRefresh === 'boolean'
          ? input.automaticRefresh
          : current.automaticRefresh,

      showArchivedPositions:
        typeof input.showArchivedPositions === 'boolean'
          ? input.showArchivedPositions
          : current.showArchivedPositions,

      requireDecisionNotes:
        typeof input.requireDecisionNotes === 'boolean'
          ? input.requireDecisionNotes
          : current.requireDecisionNotes,
    };

    return this.prisma.platformSetting.upsert({
      where: {
        id: 1,
      },

      update: settings,

      create: {
        id: 1,
        ...settings,
      },
    });
  }

  async resetSettings() {
    return this.prisma.platformSetting.upsert({
      where: {
        id: 1,
      },

      update: DEFAULT_SETTINGS,

      create: {
        id: 1,
        ...DEFAULT_SETTINGS,
      },
    });
  }
}
