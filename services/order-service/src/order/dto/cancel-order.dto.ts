import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para cancelar orden
 */
export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La razón no puede exceder 500 caracteres' })
  reason?: string;
}
