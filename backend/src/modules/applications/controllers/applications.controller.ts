import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApplicationsService } from '../services/applications.service';
import { AppVersioningService } from '../services/app-versioning.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { CreateVersionDto } from '../dto/create-version.dto';

@Controller('organizations/:orgId/applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly versioningService: AppVersioningService,
  ) {}

  @Post()
  createApplication(@Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(dto);
  }

  @Get()
  listApplications(@Param('orgId') orgId: string) {
    return this.applicationsService.findAllByOrganization(orgId);
  }

  @Post(':appId/versions')
  async createDraftVersion(@Param('appId') appId: string, @Body() dto: CreateVersionDto) {
    const app = await this.applicationsService.findByIdOrFail(appId);
    return this.versioningService.createDraftVersion(app, dto);
  }

  @Post(':appId/versions/:versionId/publish')
  async publishVersion(
    @Param('appId') appId: string,
    @Param('versionId') versionId: string,
    @Body('actorId') actorId: string,
  ) {
    const app = await this.applicationsService.findByIdOrFail(appId);
    return this.versioningService.publishVersion(app, versionId, actorId);
  }
}
