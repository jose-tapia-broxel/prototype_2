import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Schema field definition interface for form validation
 */
export interface FormFieldSchema {
  fieldId: string;
  fieldType: string;
  label?: string;
  required?: boolean;
  validationRules?: ValidationRule[];
  options?: FieldOption[];
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
}

export interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  value?: string | number;
  message?: string;
}

export interface FieldOption {
  value: string | number;
  label: string;
}

const SUPPORTED_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'date',
  'datetime',
  'time',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'file',
  'image',
  'signature',
  'address',
  'currency',
  'calculated',
  'hidden',
  'section',
  'divider',
] as const;

const VALIDATION_RULE_TYPES = ['minLength', 'maxLength', 'min', 'max', 'pattern', 'email', 'url', 'custom'] as const;

@Injectable()
export class FormSchemaValidationService {
  /**
   * Validates a complete form schema JSON array
   * @throws BadRequestException if validation fails
   */
  validateSchema(schemaJson: unknown[]): FormFieldSchema[] {
    if (!Array.isArray(schemaJson)) {
      throw new BadRequestException('Form schema must be an array');
    }

    const validatedFields: FormFieldSchema[] = [];
    const fieldIds = new Set<string>();

    for (let i = 0; i < schemaJson.length; i++) {
      const field = schemaJson[i];
      const validated = this.validateField(field, i, fieldIds);
      validatedFields.push(validated);
    }

    return validatedFields;
  }

  /**
   * Validates a single field definition
   */
  private validateField(field: unknown, index: number, fieldIds: Set<string>): FormFieldSchema {
    if (!field || typeof field !== 'object') {
      throw new BadRequestException(`Field at index ${index} must be an object`);
    }

    const f = field as Record<string, unknown>;

    // Validate required properties
    if (!f.fieldId || typeof f.fieldId !== 'string') {
      throw new BadRequestException(`Field at index ${index} must have a valid fieldId (string)`);
    }

    if (fieldIds.has(f.fieldId)) {
      throw new BadRequestException(`Duplicate fieldId: "${f.fieldId}" at index ${index}`);
    }
    fieldIds.add(f.fieldId);

    if (!f.fieldType || typeof f.fieldType !== 'string') {
      throw new BadRequestException(`Field "${f.fieldId}" must have a valid fieldType (string)`);
    }

    if (!SUPPORTED_FIELD_TYPES.includes(f.fieldType as typeof SUPPORTED_FIELD_TYPES[number])) {
      throw new BadRequestException(
        `Field "${f.fieldId}" has unsupported fieldType: "${f.fieldType}". Supported types: ${SUPPORTED_FIELD_TYPES.join(', ')}`
      );
    }

    // Validate optional properties
    if (f.label !== undefined && typeof f.label !== 'string') {
      throw new BadRequestException(`Field "${f.fieldId}" label must be a string`);
    }

    if (f.required !== undefined && typeof f.required !== 'boolean') {
      throw new BadRequestException(`Field "${f.fieldId}" required must be a boolean`);
    }

    // Validate options for select/radio/checkbox fields
    this.validateFieldOptions(f);

    // Validate validation rules
    this.validateValidationRules(f);

    return {
      fieldId: f.fieldId,
      fieldType: f.fieldType,
      label: f.label as string | undefined,
      required: f.required as boolean | undefined,
      validationRules: f.validationRules as ValidationRule[] | undefined,
      options: f.options as FieldOption[] | undefined,
      defaultValue: f.defaultValue,
      placeholder: f.placeholder as string | undefined,
      helpText: f.helpText as string | undefined,
    };
  }

  /**
   * Validates field options for select, radio, checkbox, and multiselect fields
   */
  private validateFieldOptions(field: Record<string, unknown>): void {
    const optionRequiredTypes = ['select', 'multiselect', 'radio', 'checkbox'];
    
    if (optionRequiredTypes.includes(field.fieldType as string)) {
      if (!field.options || !Array.isArray(field.options)) {
        throw new BadRequestException(
          `Field "${field.fieldId}" of type "${field.fieldType}" must have an options array`
        );
      }

      if (field.options.length === 0) {
        throw new BadRequestException(
          `Field "${field.fieldId}" options array cannot be empty`
        );
      }

      for (let i = 0; i < field.options.length; i++) {
        const opt = field.options[i] as Record<string, unknown>;
        if (!opt || typeof opt !== 'object') {
          throw new BadRequestException(
            `Field "${field.fieldId}" option at index ${i} must be an object`
          );
        }
        if (opt.value === undefined || opt.value === null) {
          throw new BadRequestException(
            `Field "${field.fieldId}" option at index ${i} must have a value`
          );
        }
        if (!opt.label || typeof opt.label !== 'string') {
          throw new BadRequestException(
            `Field "${field.fieldId}" option at index ${i} must have a label (string)`
          );
        }
      }
    }
  }

  /**
   * Validates field validation rules
   */
  private validateValidationRules(field: Record<string, unknown>): void {
    if (!field.validationRules) return;

    if (!Array.isArray(field.validationRules)) {
      throw new BadRequestException(
        `Field "${field.fieldId}" validationRules must be an array`
      );
    }

    for (let i = 0; i < field.validationRules.length; i++) {
      const rule = field.validationRules[i] as Record<string, unknown>;
      
      if (!rule || typeof rule !== 'object') {
        throw new BadRequestException(
          `Field "${field.fieldId}" validation rule at index ${i} must be an object`
        );
      }

      if (!rule.type || typeof rule.type !== 'string') {
        throw new BadRequestException(
          `Field "${field.fieldId}" validation rule at index ${i} must have a type`
        );
      }

      if (!VALIDATION_RULE_TYPES.includes(rule.type as typeof VALIDATION_RULE_TYPES[number])) {
        throw new BadRequestException(
          `Field "${field.fieldId}" validation rule type "${rule.type}" is not supported. Supported types: ${VALIDATION_RULE_TYPES.join(', ')}`
        );
      }

      // Validate rule value based on type
      this.validateRuleValue(field.fieldId as string, rule, i);
    }
  }

  /**
   * Validates the value of a validation rule based on its type
   */
  private validateRuleValue(fieldId: string, rule: Record<string, unknown>, ruleIndex: number): void {
    const numericValueTypes = ['minLength', 'maxLength', 'min', 'max'];
    const stringValueTypes = ['pattern'];

    if (numericValueTypes.includes(rule.type as string)) {
      if (rule.value !== undefined && typeof rule.value !== 'number') {
        throw new BadRequestException(
          `Field "${fieldId}" validation rule ${rule.type} at index ${ruleIndex} must have a numeric value`
        );
      }
    }

    if (stringValueTypes.includes(rule.type as string)) {
      if (rule.value !== undefined && typeof rule.value !== 'string') {
        throw new BadRequestException(
          `Field "${fieldId}" validation rule ${rule.type} at index ${ruleIndex} must have a string value (regex pattern)`
        );
      }

      // Validate regex pattern
      if (rule.value) {
        try {
          new RegExp(rule.value as string);
        } catch {
          throw new BadRequestException(
            `Field "${fieldId}" validation rule pattern at index ${ruleIndex} has invalid regex: "${rule.value}"`
          );
        }
      }
    }
  }

  /**
   * Validates submission data against a form schema
   * @returns Array of validation errors, empty if valid
   */
  validateSubmissionData(
    schemaJson: FormFieldSchema[],
    submissionData: Record<string, unknown>,
  ): string[] {
    const errors: string[] = [];

    for (const field of schemaJson) {
      const value = submissionData[field.fieldId];
      const fieldErrors = this.validateFieldValue(field, value);
      errors.push(...fieldErrors);
    }

    return errors;
  }

  /**
   * Validates a single field value against its schema
   */
  private validateFieldValue(field: FormFieldSchema, value: unknown): string[] {
    const errors: string[] = [];

    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${field.label || field.fieldId}" is required`);
      return errors; // Skip other validations if required field is empty
    }

    if (value === undefined || value === null || value === '') {
      return errors; // No validation needed for empty non-required fields
    }

    // Apply validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        const error = this.applyValidationRule(field, value, rule);
        if (error) {
          errors.push(error);
        }
      }
    }

    return errors;
  }

  /**
   * Applies a single validation rule to a value
   */
  private applyValidationRule(
    field: FormFieldSchema,
    value: unknown,
    rule: ValidationRule,
  ): string | null {
    const fieldLabel = field.label || field.fieldId;

    switch (rule.type) {
      case 'minLength':
        if (typeof value === 'string' && typeof rule.value === 'number' && value.length < rule.value) {
          return rule.message || `${fieldLabel} must be at least ${rule.value} characters`;
        }
        break;

      case 'maxLength':
        if (typeof value === 'string' && typeof rule.value === 'number' && value.length > rule.value) {
          return rule.message || `${fieldLabel} must be at most ${rule.value} characters`;
        }
        break;

      case 'min':
        if (typeof value === 'number' && typeof rule.value === 'number' && value < rule.value) {
          return rule.message || `${fieldLabel} must be at least ${rule.value}`;
        }
        break;

      case 'max':
        if (typeof value === 'number' && typeof rule.value === 'number' && value > rule.value) {
          return rule.message || `${fieldLabel} must be at most ${rule.value}`;
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && typeof rule.value === 'string') {
          const regex = new RegExp(rule.value);
          if (!regex.test(value)) {
            return rule.message || `${fieldLabel} format is invalid`;
          }
        }
        break;

      case 'email':
        if (typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return rule.message || `${fieldLabel} must be a valid email address`;
          }
        }
        break;

      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            return rule.message || `${fieldLabel} must be a valid URL`;
          }
        }
        break;
    }

    return null;
  }
}
