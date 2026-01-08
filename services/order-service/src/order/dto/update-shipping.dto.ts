import { IsEnum, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

/**
 * Estados de envío
 */
export enum ShippingStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
}

/**
 * DTO para actualizar estado de envío de sub-orden
 */
export class UpdateShippingDto {
  @IsEnum(ShippingStatus, {
    message: 'Estado debe ser uno de: pending, shipped, delivered'
  })
  status: ShippingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El número de rastreo no puede exceder 100 caracteres' })
  @Matches(/^[a-zA-Z0-9-]+$/, { message: 'Número de rastreo inválido' })
  tracking_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El nombre del transportista no puede exceder 50 caracteres' })
  carrier?: string;
}
