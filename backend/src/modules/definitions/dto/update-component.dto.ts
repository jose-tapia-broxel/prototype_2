import { IsInt, IsObject, IsOptional, IsString, Length } from 'class-validator';

/**
 * Update DTO for components.
 * Note: screenId and formId are NOT allowed in update operations.
 * A component's parent cannot be changed after creation - this enforces data integrity.
 */
export class UpdateComponentDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  componentType?: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/**
 * DTO for moving a component to a different parent (requires special handling)
 */
export class MoveComponentDto {
  @IsOptional()
  @IsString()
  screenId?: string;

  @IsOptional()
  @IsString()
  formId?: string;
}
