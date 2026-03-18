import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApplicationsService } from '../services/applications.service';
import { AppVersioningService } from '../services/app-versioning.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@Controller('organizations/:orgId/applications')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly versioningService: AppVersioningService,
  ) {}

  @Post()
  createApplication(
    @TenantId() orgId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    dto.organizationId = orgId;
    return this.applicationsService.create(dto);
  }

  @Get()
  listApplications(@TenantId() orgId: string) {
    return this.applicationsService.findAllByOrganization(orgId);
  }

  @Post(':appId/versions')
  async createDraftVersion(
    @Param('appId') appId: string,
    @Body() dto: CreateVersionDto,
  ) {
    const app = await this.applicationsService.findByIdOrFail(appId);
    return this.versioningService.createDraftVersion(app, dto);
  }

  @Post(':appId/versions/:versionId/publish')
  async publishVersion(
    @Param('appId') appId: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const app = await this.applicationsService.findByIdOrFail(appId);
    return this.versioningService.publishVersion(app, versionId, user.userId);
  }
}
