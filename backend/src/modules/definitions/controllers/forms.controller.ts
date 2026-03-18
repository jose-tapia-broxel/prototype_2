import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors, NotFoundException } from '@nestjs/common';
import { FormsService } from '../services/forms.service';
import { CreateFormDto } from '../dto/create-form.dto';
import { UpdateFormDto } from '../dto/update-form.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@Controller('organizations/:orgId/forms')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  createForm(
    @TenantId() orgId: string,
    @Body() dto: CreateFormDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    dto.organizationId = orgId;
    dto.createdBy = user.userId;
    return this.formsService.create(dto);
  }

  @Get()
  listForms(
    @TenantId() orgId: string,
    @Query('applicationId') applicationId?: string,
  ) {
    if (applicationId) {
      return this.formsService.findAllByApplication(applicationId, orgId);
    }
    return this.formsService.findAllByOrganization(orgId);
  }

  @Get(':formId')
  async getForm(
    @TenantId() orgId: string,
    @Param('formId') formId: string,
  ) {
    const form = await this.formsService.findById(formId, orgId);
    if (!form) {
      throw new NotFoundException(`Form with id ${formId} not found`);
    }
    return form;
  }

  @Patch(':formId')
  updateForm(
    @TenantId() orgId: string,
    @Param('formId') formId: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formsService.update(formId, orgId, dto);
  }

  @Delete(':formId')
  deleteForm(
    @TenantId() orgId: string,
    @Param('formId') formId: string,
  ) {
    return this.formsService.delete(formId, orgId);
  }
}
