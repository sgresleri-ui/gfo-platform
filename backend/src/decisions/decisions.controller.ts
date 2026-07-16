import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { DecisionsService } from './decisions.service';
import type { CreateDecisionInput } from './decisions.service';

@Controller('decisions')
export class DecisionsController {
  constructor(
    private readonly decisionsService: DecisionsService,
  ) {}

  @Get()
  getOverview() {
    return this.decisionsService.getOverview();
  }

  @Post()
  createDecision(
    @Body() input: CreateDecisionInput,
  ) {
    return this.decisionsService.createDecision(
      input,
    );
  }
}
