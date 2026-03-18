import { IsInt, IsObject, IsOptional, IsString, IsUUID, Length, ValidateIf, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Custom decorator to validate XOR constraint: exactly one of screenId or formId must be set
 */
export function IsXorWith(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isXorWith',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: `Component must belong to exactly one parent. Provide either ${propertyName} or ${property}, not both and not neither.`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
          
          // XOR: exactly one should be truthy
          const hasThis = value !== undefined && value !== null && value !== '';
          const hasOther = relatedValue !== undefined && relatedValue !== null && relatedValue !== '';
          
          return (hasThis && !hasOther) || (!hasThis && hasOther);
        },
      },
    });
  };
}

export class CreateComponentDto {
  @ValidateIf(o => !o.formId)
  @IsUUID()
  @IsXorWith('formId')
  screenId?: string;

  @ValidateIf(o => !o.screenId)
  @IsUUID()
  formId?: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @Length(1, 80)
  componentType!: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
