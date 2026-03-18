import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors, NotFoundException } from '@nestjs/common';
import { ScreensService } from '../services/screens.service';
import { CreateScreenDto } from '../dto/create-screen.dto';
import { UpdateScreenDto } from '../dto/update-screen.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@Controller('organizations/:orgId/screens')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  @Post()
  createScreen(
    @TenantId() orgId: string,
    @Body() dto: CreateScreenDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    dto.organizationId = orgId;
    dto.createdBy = user.userId;
    return this.screensService.create(dto);
  }

  @Get()
  listScreens(
    @TenantId() orgId: string,
    @Query('applicationId') applicationId?: string,
  ) {
    if (applicationId) {
      return this.screensService.findAllByApplication(applicationId, orgId);
    }
    return this.screensService.findAllByOrganization(orgId);
  }

  @Get(':screenId')
  async getScreen(
    @TenantId() orgId: string,
    @Param('screenId') screenId: string,
  ) {
    const screen = await this.screensService.findById(screenId, orgId);
    if (!screen) {
      throw new NotFoundException(`Screen with id ${screenId} not found`);
    }
    return screen;
  }

  @Patch(':screenId')
  updateScreen(
    @TenantId() orgId: string,
    @Param('screenId') screenId: string,
    @Body() dto: UpdateScreenDto,
  ) {
    return this.screensService.update(screenId, orgId, dto);
  }

  @Delete(':screenId')
  deleteScreen(
    @TenantId() orgId: string,
    @Param('screenId') screenId: string,
  ) {
    return this.screensService.delete(screenId, orgId);
  }
}
