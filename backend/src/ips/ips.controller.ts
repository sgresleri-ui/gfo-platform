import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import {
  IpsClassificationService,
} from './ips-classification.service';

import {
  IpsService,
} from './ips.service';

@Controller('ips')
export class IpsController {
  constructor(
    private readonly ipsService:
      IpsService,

    private readonly classificationService:
      IpsClassificationService,
  ) {}

  @Get('classifications')
  getClassifications() {
    return this.classificationService
      .getOverview();
  }

  @Get('classifications/review-audit')
  getClassificationReviewAudit() {
    return this.classificationService
      .getReviewAuditHistory();
  }

  @Post('classifications/:positionId/review')
  updateClassificationReview(
    @Param(
      'positionId',
      ParseIntPipe,
    )
    positionId: number,

    @Body('status')
    status: string,

    @Body('note')
    note: string,

    @Body('confirm')
    confirm: boolean,
  ) {
    return this.classificationService
      .updateReviewStatus(
        positionId,
        status,
        note,
        confirm,
      );
  }

  @Get('classifications/audit')
  getClassificationAudit() {
    return this.classificationService
      .getAuditHistory();
  }

  @Post('classifications/:positionId')
  updateClassification(
    @Param(
      'positionId',
      ParseIntPipe,
    )
    positionId: number,

    @Body('ipsAssetClass')
    ipsAssetClass: string,

    @Body('reason')
    reason: string,

    @Body('confirm')
    confirm: boolean,
  ) {
    return this.classificationService
      .updateClassification(
        positionId,
        ipsAssetClass,
        reason,
        confirm,
      );
  }

  @Get('metrics')
  getSupportedMetrics() {
    return this.ipsService
      .getSupportedMetrics();
  }

  @Get('limits')
  getLimits() {
    return this.ipsService
      .getLimits();
  }

  @Get('compliance')
  getCompliance() {
    return this.ipsService
      .getCompliance();
  }

  @Post('limits/:code')
  updateLimit(
    @Param('code')
    code: string,

    @Body()
    body: {
      minimum?: number | null;
      maximum?: number | null;
      target?: number | null;
      enabled?: boolean;
      rationale?: string | null;
      confirm?: boolean;
    },
  ) {
    return this.ipsService
      .updateLimit(
        code,
        body,
      );
  }
}
