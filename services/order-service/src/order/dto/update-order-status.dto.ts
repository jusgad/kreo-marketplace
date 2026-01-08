import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Estados posibles de una orden
 */
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * DTO para actualizar estado de orden (admin only)
 */
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'Estado debe ser uno de: pending, processing, paid, shipped, delivered, cancelled'
  })
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}
