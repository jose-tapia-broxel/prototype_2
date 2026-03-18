import { Body, Controller, Get, Param, Post, Patch, Query, UseGuards, UseInterceptors, NotFoundException } from '@nestjs/common';
import { ApplicationsService } from '../services/applications.service';
import { AppVersioningService } from '../services/app-versioning.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { UpdateApplicationDto } from '../dto/update-application.dto';
import { CreateVersionDto } from '../dto/create-version.dto';
import { UpdateVersionDto } from '../dto/update-version.dto';
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

  @Get(':appId')
  async getApplication(
    @TenantId() orgId: string,
    @Param('appId') appId: string,
  ) {
    const app = await this.applicationsService.findById(appId, orgId);
    if (!app) {
      throw new NotFoundException(`Application with id ${appId} not found`);
    }
    return app;
  }

  @Patch(':appId')
  updateApplication(
    @TenantId() orgId: string,
    @Param('appId') appId: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(appId, orgId, dto);
  }

  /**
   * Lists all versions for an application (summary without full definition)
   */
  @Get(':appId/versions')
  async listVersions(
    @Param('appId') appId: string,
    @Query('status') status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ) {
    const versions = await this.versioningService.listVersions(appId);
    if (status) {
      return versions.filter(v => v.status === status);
    }
    return versions;
  }

  /**
   * Gets a specific version with full definition JSON
   */
  @Get(':appId/versions/:versionId')
  async getVersion(
    @Param('appId') appId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versioningService.getVersion(appId, versionId);
  }

  /**
   * Gets the current published version (if any)
   */
  @Get(':appId/versions/current')
  async getCurrentVersion(@Param('appId') appId: string) {
    const version = await this.versioningService.getCurrentPublishedVersion(appId);
    if (!version) {
      throw new NotFoundException(`No published version found for application ${appId}`);
    }
    return version;
  }

  /**
   * Gets the latest draft version (if any)
   */
  @Get(':appId/versions/draft')
  async getLatestDraft(@Param('appId') appId: string) {
    const version = await this.versioningService.getLatestDraftVersion(appId);
    if (!version) {
      throw new NotFoundException(`No draft version found for application ${appId}`);
    }
    return version;
  }

  /**
   * Compares two versions
   */
  @Get(':appId/versions/compare')
  async compareVersions(
    @Param('appId') appId: string,
    @Query('versionA') versionA: string,
    @Query('versionB') versionB: string,
  ) {
    return this.versioningService.compareVersions(appId, versionA, versionB);
  }

  @Post(':appId/versions')
  async createDraftVersion(
    @TenantId() orgId: string,
    @Param('appId') appId: string,
    @Body() dto: CreateVersionDto,
  ) {
    const app = await this.applicationsService.findByIdOrFail(appId);
    return this.versioningService.createDraftVersion(app, dto);
  }

  @Patch(':appId/versions/:versionId')
  async updateDraftVersion(
    @TenantId() orgId: string,
    @Param('appId') appId: string,
    @Param('versionId') versionId: string,
    @Body() dto: UpdateVersionDto,
  ) {
    const app = await this.applicationsService.findByIdOrFail(appId);
    return this.versioningService.updateDraftVersion(app, versionId, dto);
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

  @Post(':appId/versions/:versionId/rollback')
  async rollbackToVersion(
    @TenantId() orgId: string,
    @Param('appId') appId: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const app = await this.applicationsService.findByIdOrFail(appId);
    return this.versioningService.rollbackToVersion(app, versionId, user.userId);
  }
}
