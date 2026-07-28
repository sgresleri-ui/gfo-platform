import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
