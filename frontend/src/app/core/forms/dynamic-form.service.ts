import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { FormSchema, FormFieldDefinition } from '../../models/api.model';

/**
 * Dynamic Form Generator Service
 * Phase 5: Frontend Core - Dynamic form generation from schema_json
 */
@Injectable({
  providedIn: 'root'
})
export class DynamicFormService {
  private fb = inject(FormBuilder);

  /**
   * Generate a FormGroup from a FormSchema
   */
  createFormFromSchema(schema: FormSchema, initialData?: Record<string, unknown>): FormGroup {
    const controls: Record<string, FormControl> = {};

    schema.fields.forEach(field => {
      const validators = this.buildValidators(field);
      const initialValue = this.getInitialValue(field, initialData);
      controls[field.id] = new FormControl(initialValue, validators);
    });

    return this.fb.group(controls);
  }

  /**
   * Build validators array for a field
   */
  private buildValidators(field: FormFieldDefinition): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    // Required validator
    if (field.required) {
      validators.push(Validators.required);
    }

    // Field-specific validators
    if (field.validation) {
      if (field.validation.minLength) {
        validators.push(Validators.minLength(field.validation.minLength));
      }
      if (field.validation.maxLength) {
        validators.push(Validators.maxLength(field.validation.maxLength));
      }
      if (field.validation.min !== undefined) {
        validators.push(Validators.min(field.validation.min));
      }
      if (field.validation.max !== undefined) {
        validators.push(Validators.max(field.validation.max));
      }
      if (field.validation.pattern) {
        validators.push(Validators.pattern(field.validation.pattern));
      }
    }

    // Type-specific validators
    switch (field.type) {
      case 'email':
        validators.push(Validators.email);
        break;
      case 'url':
        validators.push(this.urlValidator());
        break;
      case 'phone':
        validators.push(this.phoneValidator());
        break;
    }

    return validators;
  }

  /**
   * Get initial value for a field
   */
  private getInitialValue(field: FormFieldDefinition, initialData?: Record<string, unknown>): unknown {
    // Priority: initialData > defaultValue > type default
    if (initialData && initialData[field.id] !== undefined) {
      return initialData[field.id];
    }
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }
    
    // Type defaults
    switch (field.type) {
      case 'checkbox':
      case 'toggle':
        return false;
      case 'number':
        return null;
      case 'multiselect':
        return [];
      default:
        return '';
    }
  }

  /**
   * Custom URL validator
   */
  private urlValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      try {
        new URL(control.value);
        return null;
      } catch {
        return { url: { value: control.value } };
      }
    };
  }

  /**
   * Custom phone validator (basic international format)
   */
  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
      return phoneRegex.test(control.value) ? null : { phone: { value: control.value } };
    };
  }

  /**
   * Get validation error message for a field
   */
  getErrorMessage(control: AbstractControl, fieldLabel: string): string {
    if (control.hasError('required')) {
      return `${fieldLabel} is required`;
    }
    if (control.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control.hasError('minlength')) {
      const error = control.getError('minlength');
      return `${fieldLabel} must be at least ${error.requiredLength} characters`;
    }
    if (control.hasError('maxlength')) {
      const error = control.getError('maxlength');
      return `${fieldLabel} cannot exceed ${error.requiredLength} characters`;
    }
    if (control.hasError('min')) {
      const error = control.getError('min');
      return `${fieldLabel} must be at least ${error.min}`;
    }
    if (control.hasError('max')) {
      const error = control.getError('max');
      return `${fieldLabel} cannot exceed ${error.max}`;
    }
    if (control.hasError('pattern')) {
      return `${fieldLabel} format is invalid`;
    }
    if (control.hasError('url')) {
      return 'Please enter a valid URL';
    }
    if (control.hasError('phone')) {
      return 'Please enter a valid phone number';
    }
    return 'This field is invalid';
  }
}
