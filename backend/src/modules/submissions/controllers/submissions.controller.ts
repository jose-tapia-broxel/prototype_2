import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
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
}
