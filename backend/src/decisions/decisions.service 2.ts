import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

export type CreateDecisionInput = {
  date: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  motivation: string;
  analysis: string;
  alternatives?: string[];
  finalDecision: string;
  impact: string;
  amount?: number | null;
  result: string;
  lessons: string;
};

const SEED_DECISIONS = [
  {
    id: 'ips-approval',
    decisionDate: new Date(
      '2026-07-10T00:00:00.000Z',
    ),
    title:
      'Adozione dell’Investment Policy Statement',
    category: 'POLICY',
    status: 'APPROVED',
    priority: 'HIGH',
    motivation:
      'Creare una disciplina permanente per la conservazione e la crescita del patrimonio familiare nel lungo periodo.',
    analysisText:
      'Sono stati definiti obiettivi, orizzonte temporale, profilo di rischio, asset allocation strategica, criteri ETF, regole di ribilanciamento e gestione della liquidità.',
    alternativesJson: JSON.stringify([
      'Gestione degli investimenti senza una politica formalizzata',
      'Delega completa agli intermediari finanziari',
      'Portafoglio basato prevalentemente su singoli titoli',
    ]),
    finalDecision:
      'Utilizzare l’IPS come documento guida vincolante per tutte le future decisioni patrimoniali e finanziarie.',
    impact:
      'Maggiore diversificazione, controllo del rischio, contenimento dei costi e coerenza delle operazioni nel tempo.',
    amount: null,
    resultText:
      'IPS approvato e utilizzato come riferimento strategico del Family Office.',
    lessons:
      'Le singole operazioni devono essere valutate nel contesto del patrimonio complessivo e non isolatamente.',
    source: 'PROJECT_HISTORY',
  },
  {
    id: 'gfo-platform',
    decisionDate: new Date(
      '2026-07-13T00:00:00.000Z',
    ),
    title:
      'Sviluppo della GFO Platform',
    category: 'PLATFORM',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    motivation:
      'Superare progressivamente i limiti operativi del file Gresleri2026.xlsm e creare un sistema centrale per la gestione del patrimonio.',
    analysisText:
      'È stata scelta un’architettura con backend NestJS, database Prisma e frontend React, mantenendo inizialmente Excel come sorgente dati.',
    alternativesJson: JSON.stringify([
      'Continuare a utilizzare esclusivamente Excel',
      'Acquistare un software Family Office commerciale',
      'Utilizzare applicazioni separate per ogni area patrimoniale',
    ]),
    finalDecision:
      'Sviluppare internamente una piattaforma modulare che sostituisca progressivamente Excel senza interrompere l’operatività corrente.',
    impact:
      'Centralizzazione dei dati, maggiore controllo, tracciabilità delle decisioni e possibilità di simulazioni patrimoniali.',
    amount: null,
    resultText:
      'Operativi i moduli Dashboard, Patrimonio, Investimenti, Liquidità, Immobili, Budget, Planning, Report, Decisioni e Impostazioni.',
    lessons:
      'Lo sviluppo deve procedere per moduli piccoli, verificabili e collegati a dati reali.',
    source: 'PROJECT_HISTORY',
  },
  {
    id: 'el-toro-sale',
    decisionDate: new Date(
      '2026-07-16T00:00:00.000Z',
    ),
    title:
      'Classificazione e vendita dell’immobile El Toro',
    category: 'PROPERTY',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    motivation:
      'Preparare correttamente la trasformazione dell’immobile in liquidità disponibile alla data del rogito.',
    analysisText:
      'Sono stati verificati prezzo di vendita, costo storico, data prevista del rogito e trattamento patrimoniale fino al perfezionamento della vendita.',
    alternativesJson: JSON.stringify([
      'Eliminare immediatamente l’immobile dal patrimonio',
      'Registrare subito il ricavato come liquidità',
      'Mantenere l’immobile senza evidenziare lo stato di vendita',
    ]),
    finalDecision:
      'Mantenere El Toro nel patrimonio immobiliare, classificato come destinato alla vendita, fino al rogito previsto il 31 luglio 2026.',
    impact:
      'Valore immobiliare lordo di €2.150.000 che sarà successivamente trasformato in liquidità, al netto di costi e fiscalità.',
    amount: 2150000,
    resultText:
      'Immobile registrato correttamente nella piattaforma come PROPERTY_HELD_FOR_SALE.',
    lessons:
      'Gli eventi non perfezionati devono essere rappresentati distintamente dagli incassi già realizzati.',
    source: 'PROJECT_HISTORY',
  },
  {
    id: 'budget-long-term',
    decisionDate: new Date(
      '2026-07-16T00:00:00.000Z',
    ),
    title:
      'Validazione del piano patrimoniale 2027–2066',
    category: 'PLANNING',
    status: 'MONITORING',
    priority: 'HIGH',
    motivation:
      'Verificare la sostenibilità delle spese familiari, degli investimenti immobiliari e dei futuri flussi pensionistici.',
    analysisText:
      'Il piano considera 40 anni, il forte assorbimento finanziario del 2027, le pensioni future e l’evoluzione annuale del capitale.',
    alternativesJson: JSON.stringify([
      'Analisi limitata al solo budget annuale',
      'Proiezione senza eventi immobiliari straordinari',
      'Pianificazione senza considerare le pensioni',
    ]),
    finalDecision:
      'Utilizzare il piano 2027–2066 come scenario base, aggiornandolo quando cambiano investimenti, immobili, inflazione o flussi familiari.',
    impact:
      'Disavanzo previsto nel 2027 di €1.194.270,57; capitale minimo di €1.325.163,80 nel 2039; capitale sempre positivo fino al 2066.',
    amount: -1194270.57,
    resultText:
      'Scenario base giudicato sostenibile, pur con una significativa riduzione del capitale nella prima fase.',
    lessons:
      'Il principale rischio non è l’esaurimento del patrimonio, ma la concentrazione degli esborsi tra il 2027 e il 2039.',
    source: 'PROJECT_HISTORY',
  },
];

@Injectable()
export class DecisionsService {
  private readonly prisma = new PrismaClient();

  private formatDate(value: Date): string {
    const iso = value.toISOString().slice(0, 10);
    const [year, month, day] = iso.split('-');

    return `${day}/${month}/${year}`;
  }

  private parseAlternatives(
    value: string,
  ): string[] {
    try {
      const parsed: unknown = JSON.parse(value);

      if (
        Array.isArray(parsed) &&
        parsed.every(
          (item) => typeof item === 'string',
        )
      ) {
        return parsed;
      }

      return [];
    } catch {
      return [];
    }
  }

  private serializeDecision(
    decision: {
      id: string;
      decisionDate: Date;
      title: string;
      category: string;
      status: string;
      priority: string;
      motivation: string;
      analysisText: string;
      alternativesJson: string;
      finalDecision: string;
      impact: string;
      amount: number | null;
      resultText: string;
      lessons: string;
      source: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    return {
      id: decision.id,
      date: this.formatDate(
        decision.decisionDate,
      ),
      decisionDate:
        decision.decisionDate.toISOString(),
      title: decision.title,
      category: decision.category,
      status: decision.status,
      priority: decision.priority,
      motivation: decision.motivation,
      analysis: decision.analysisText,
      alternatives: this.parseAlternatives(
        decision.alternativesJson,
      ),
      finalDecision:
        decision.finalDecision,
      impact: decision.impact,
      amount: decision.amount,
      result: decision.resultText,
      lessons: decision.lessons,
      source: decision.source,
      createdAt:
        decision.createdAt.toISOString(),
      updatedAt:
        decision.updatedAt.toISOString(),
    };
  }

  private async ensureSeedDecisions() {
    for (const decision of SEED_DECISIONS) {
      const existing =
        await this.prisma.decisionLogEntry.findUnique(
          {
            where: {
              id: decision.id,
            },

            select: {
              id: true,
            },
          },
        );

      if (!existing) {
        await this.prisma.decisionLogEntry.create(
          {
            data: decision,
          },
        );
      }
    }
  }

  private parseInputDate(
    value: string,
  ): Date {
    const trimmed = value.trim();

    const italianMatch = trimmed.match(
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
        'Data decisione non valida.',
      );
    }

    return parsed;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 45);
  }

  async getOverview() {
    await this.ensureSeedDecisions();

    const decisions =
      await this.prisma.decisionLogEntry.findMany(
        {
          orderBy: [
            {
              decisionDate: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
        },
      );

    return {
      summary: {
        total: decisions.length,

        approved: decisions.filter(
          (decision) =>
            decision.status === 'APPROVED',
        ).length,

        inProgress: decisions.filter(
          (decision) =>
            decision.status ===
            'IN_PROGRESS',
        ).length,

        monitoring: decisions.filter(
          (decision) =>
            decision.status ===
            'MONITORING',
        ).length,

        highPriority: decisions.filter(
          (decision) =>
            decision.priority === 'HIGH',
        ).length,
      },

      decisions: decisions.map(
        (decision) =>
          this.serializeDecision(decision),
      ),
    };
  }

  async createDecision(
    input: CreateDecisionInput,
  ) {
    const requiredValues = [
      input.date,
      input.title,
      input.category,
      input.status,
      input.priority,
      input.motivation,
      input.analysis,
      input.finalDecision,
      input.impact,
      input.result,
      input.lessons,
    ];

    if (
      requiredValues.some(
        (value) =>
          typeof value !== 'string' ||
          value.trim().length === 0,
      )
    ) {
      throw new BadRequestException(
        'Tutti i campi obbligatori devono essere compilati.',
      );
    }

    const decisionDate =
      this.parseInputDate(input.date);

    const id = [
      'decision',
      decisionDate
        .toISOString()
        .slice(0, 10),
      this.slugify(input.title),
      Date.now(),
    ].join('-');

    const created =
      await this.prisma.decisionLogEntry.create(
        {
          data: {
            id,
            decisionDate,
            title: input.title.trim(),
            category:
              input.category.trim().toUpperCase(),
            status:
              input.status.trim().toUpperCase(),
            priority:
              input.priority.trim().toUpperCase(),
            motivation:
              input.motivation.trim(),
            analysisText:
              input.analysis.trim(),
            alternativesJson:
              JSON.stringify(
                input.alternatives ?? [],
              ),
            finalDecision:
              input.finalDecision.trim(),
            impact: input.impact.trim(),
            amount:
              typeof input.amount === 'number' &&
              Number.isFinite(input.amount)
                ? input.amount
                : null,
            resultText:
              input.result.trim(),
            lessons: input.lessons.trim(),
            source: 'MANUAL',
          },
        },
      );

    return this.serializeDecision(created);
  }
}
