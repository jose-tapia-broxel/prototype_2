import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../entities/form.entity';
import { CreateFormDto } from '../dto/create-form.dto';
import { UpdateFormDto } from '../dto/update-form.dto';
import { FormSchemaValidationService, FormFieldSchema } from './form-schema-validation.service';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private readonly formsRepo: Repository<Form>,
    private readonly schemaValidation: FormSchemaValidationService,
  ) {}

  create(dto: CreateFormDto): Promise<Form> {
    // Validate schema if provided
    if (dto.schemaJson && dto.schemaJson.length > 0) {
      this.schemaValidation.validateSchema(dto.schemaJson);
    }
    return this.formsRepo.save(this.formsRepo.create(dto));
  }

  /**
   * Validates form schema without saving
   * @returns Validated schema or throws BadRequestException
   */
  validateSchema(schemaJson: unknown[]): FormFieldSchema[] {
    return this.schemaValidation.validateSchema(schemaJson);
  }

  /**
   * Validates submission data against a form's schema
   * @returns Array of validation errors, empty if valid
   */
  async validateSubmissionData(
    formId: string,
    organizationId: string,
    submissionData: Record<string, unknown>,
  ): Promise<string[]> {
    const form = await this.findByIdOrFail(formId, organizationId);
    const validatedSchema = this.schemaValidation.validateSchema(form.schemaJson as unknown[]);
    return this.schemaValidation.validateSubmissionData(validatedSchema, submissionData);
  }

  findAllByApplication(applicationId: string, organizationId: string): Promise<Form[]> {
    return this.formsRepo.find({ where: { applicationId, organizationId } });
  }

  findAllByOrganization(organizationId: string): Promise<Form[]> {
    return this.formsRepo.find({ where: { organizationId } });
  }

  async findById(id: string, organizationId: string): Promise<Form | null> {
    return this.formsRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string, organizationId: string): Promise<Form> {
    return this.formsRepo.findOneByOrFail({ id, organizationId });
  }

  async update(id: string, organizationId: string, dto: UpdateFormDto): Promise<Form> {
    const form = await this.formsRepo.findOne({ where: { id, organizationId } });
    if (!form) {
      throw new NotFoundException(`Form with id ${id} not found`);
    }
    // Validate schema if being updated
    if (dto.schemaJson) {
      this.schemaValidation.validateSchema(dto.schemaJson);
    }
    Object.assign(form, dto);
    return this.formsRepo.save(form);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.formsRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Form with id ${id} not found`);
    }
  }
}
