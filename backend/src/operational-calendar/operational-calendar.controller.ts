import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  OperationalCalendarService,
  type CreateOperationalTaskInput,
  type UpdateOperationalTaskInput,
} from './operational-calendar.service';

@Controller('operational-calendar')
export class OperationalCalendarController {
  constructor(
    private readonly service:
      OperationalCalendarService,
  ) {}

  @Get()
  getOverview() {
    return this.service.getOverview();
  }

  @Post()
  createTask(
    @Body()
    input: CreateOperationalTaskInput,
  ) {
    return this.service.createTask(input);
  }

  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body()
    input: UpdateOperationalTaskInput,
  ) {
    return this.service.updateTask(
      id,
      input,
    );
  }
}
