import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { SubmissionQueryDto } from '../dto/submission-query.dto';
import { SubmissionsService } from '../services/submissions.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(
    @TenantId() orgId: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    dto.organizationId = orgId;
    return this.submissionsService.ingest(dto);
  }

  @Get()
  findAll(
    @TenantId() orgId: string,
    @Query() query: SubmissionQueryDto,
  ) {
    return this.submissionsService.findAllByOrganization(orgId, {
      status: query.status,
      workflowInstanceId: query.workflowInstanceId,
      formId: query.formId,
    });
  }

  @Get('stats')
  getStats(@TenantId() orgId: string) {
    return this.submissionsService.getStats(orgId);
  }

  @Get(':id')
  findOne(
    @TenantId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.submissionsService.findByIdAndOrgOrFail(id, orgId);
  }

  @Get('workflow-instance/:instanceId')
  findByWorkflowInstance(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
  ) {
    return this.submissionsService.findByWorkflowInstance(instanceId);
  }
}
