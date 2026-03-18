import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../../definitions/entities/form.entity';

interface FieldSchema {
  name: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'checkbox' | 'file' | 'textarea';
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  options?: Array<{ value: string; label: string }>;
  multiple?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class SubmissionValidatorService {
  private readonly logger = new Logger(SubmissionValidatorService.name);

  constructor(
    @InjectRepository(Form)
    private readonly formsRepo: Repository<Form>,
  ) {}

  /**
   * Validate submission data against a form schema
   */
  async validateAgainstForm(
    formId: string,
    organizationId: string,
    data: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const form = await this.formsRepo.findOneBy({ id: formId, organizationId });

    if (!form) {
      throw new BadRequestException(`Form ${formId} not found`);
    }

    return this.validateAgainstSchema(form.schemaJson as FieldSchema[], data);
  }

  /**
   * Validate submission data against a schema array
   */
  validateAgainstSchema(
    schema: FieldSchema[],
    data: Record<string, unknown>,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const field of schema) {
      const value = data[field.name];
      const fieldErrors = this.validateField(field, value);
      errors.push(...fieldErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateField(field: FieldSchema, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    const isPresent = value !== undefined && value !== null && value !== '';

    // Required check
    if (field.required && !isPresent) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} is required`,
        code: 'REQUIRED',
      });
      return errors; // Skip other validations if required field is missing
    }

    // Skip further validation if field is empty and not required
    if (!isPresent) {
      return errors;
    }

    switch (field.type) {
      case 'text':
      case 'textarea':
        errors.push(...this.validateText(field, value));
        break;

      case 'number':
        errors.push(...this.validateNumber(field, value));
        break;

      case 'email':
        errors.push(...this.validateEmail(field, value));
        break;

      case 'date':
        errors.push(...this.validateDate(field, value));
        break;

      case 'select':
        errors.push(...this.validateSelect(field, value));
        break;

      case 'checkbox':
        errors.push(...this.validateCheckbox(field, value));
        break;

      case 'file':
        // File validation would depend on how files are handled
        break;
    }

    // Pattern validation (regex)
    if (field.pattern && typeof value === 'string') {
      try {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: field.name,
            message: `${field.label || field.name} does not match the required pattern`,
            code: 'PATTERN_MISMATCH',
          });
        }
      } catch (e) {
        this.logger.warn(`Invalid regex pattern for field ${field.name}: ${field.pattern}`);
      }
    }

    return errors;
  }

  private validateText(field: FieldSchema, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'string') {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be a string`,
        code: 'INVALID_TYPE',
      });
      return errors;
    }

    if (field.minLength !== undefined && value.length < field.minLength) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be at least ${field.minLength} characters`,
        code: 'MIN_LENGTH',
      });
    }

    if (field.maxLength !== undefined && value.length > field.maxLength) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be at most ${field.maxLength} characters`,
        code: 'MAX_LENGTH',
      });
    }

    return errors;
  }

  private validateNumber(field: FieldSchema, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof numValue !== 'number' || isNaN(numValue)) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be a valid number`,
        code: 'INVALID_NUMBER',
      });
      return errors;
    }

    if (field.min !== undefined && numValue < field.min) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be at least ${field.min}`,
        code: 'MIN_VALUE',
      });
    }

    if (field.max !== undefined && numValue > field.max) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be at most ${field.max}`,
        code: 'MAX_VALUE',
      });
    }

    return errors;
  }

  private validateEmail(field: FieldSchema, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'string') {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be a string`,
        code: 'INVALID_TYPE',
      });
      return errors;
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be a valid email address`,
        code: 'INVALID_EMAIL',
      });
    }

    return errors;
  }

  private validateDate(field: FieldSchema, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    const dateValue = typeof value === 'string' ? new Date(value) : value;

    if (!(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be a valid date`,
        code: 'INVALID_DATE',
      });
    }

    return errors;
  }

  private validateSelect(field: FieldSchema, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!field.options || field.options.length === 0) {
      return errors;
    }

    const validValues = field.options.map((opt) => opt.value);

    if (field.multiple && Array.isArray(value)) {
      const invalidValues = value.filter((v) => !validValues.includes(String(v)));
      if (invalidValues.length > 0) {
        errors.push({
          field: field.name,
          message: `${field.label || field.name} contains invalid options: ${invalidValues.join(', ')}`,
          code: 'INVALID_OPTION',
        });
      }
    } else if (!validValues.includes(String(value))) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be one of: ${validValues.join(', ')}`,
        code: 'INVALID_OPTION',
      });
    }

    return errors;
  }

  private validateCheckbox(field: FieldSchema, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'boolean') {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be a boolean`,
        code: 'INVALID_TYPE',
      });
    }

    return errors;
  }
}
