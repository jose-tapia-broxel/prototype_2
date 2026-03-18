import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ComponentsService } from '../services/components.service';
import { CreateComponentDto } from '../dto/create-component.dto';
import { UpdateComponentDto, MoveComponentDto } from '../dto/update-component.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';

@Controller('organizations/:orgId/components')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Post()
  createComponent(
    @TenantId() orgId: string,
    @Body() dto: CreateComponentDto,
  ) {
    dto.organizationId = orgId;
    return this.componentsService.create(dto);
  }

  @Get()
  listComponents(
    @TenantId() orgId: string,
    @Query('screenId') screenId?: string,
    @Query('formId') formId?: string,
  ) {
    if (screenId && formId) {
      throw new BadRequestException('Cannot filter by both screenId and formId');
    }
    if (screenId) {
      return this.componentsService.findAllByScreen(screenId, orgId);
    }
    if (formId) {
      return this.componentsService.findAllByForm(formId, orgId);
    }
    return [];
  }

  @Get(':componentId')
  getComponent(
    @TenantId() orgId: string,
    @Param('componentId') componentId: string,
  ) {
    return this.componentsService.findByIdOrFail(componentId, orgId);
  }

  @Patch(':componentId')
  updateComponent(
    @TenantId() orgId: string,
    @Param('componentId') componentId: string,
    @Body() dto: UpdateComponentDto,
  ) {
    return this.componentsService.update(componentId, orgId, dto);
  }

  /**
   * Moves a component to a different parent (screen or form)
   * This is a separate endpoint from update to enforce the XOR constraint explicitly
   */
  @Post(':componentId/move')
  moveComponent(
    @TenantId() orgId: string,
    @Param('componentId') componentId: string,
    @Body() dto: MoveComponentDto,
  ) {
    return this.componentsService.moveComponent(componentId, orgId, dto);
  }

  /**
   * Duplicates a component within the same parent
   */
  @Post(':componentId/duplicate')
  duplicateComponent(
    @TenantId() orgId: string,
    @Param('componentId') componentId: string,
  ) {
    return this.componentsService.duplicateComponent(componentId, orgId);
  }

  @Delete(':componentId')
  deleteComponent(
    @TenantId() orgId: string,
    @Param('componentId') componentId: string,
  ) {
    return this.componentsService.delete(componentId, orgId);
  }

  /**
   * Reorders components within a parent (screen or form)
   */
  @Post('reorder')
  reorderComponents(
    @TenantId() orgId: string,
    @Body() dto: { parentId: string; parentType: 'screen' | 'form'; orderedIds: string[] },
  ) {
    if (!['screen', 'form'].includes(dto.parentType)) {
      throw new BadRequestException('parentType must be "screen" or "form"');
    }
    if (!dto.orderedIds || !Array.isArray(dto.orderedIds)) {
      throw new BadRequestException('orderedIds must be an array of component IDs');
    }
    return this.componentsService.reorder(dto.parentId, dto.parentType, orgId, dto.orderedIds);
  }
}
