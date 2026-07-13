import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseholdService {
  constructor(private readonly prisma: PrismaService) {}

  async findFirst() {
    return this.prisma.household.findFirst();
  }
}