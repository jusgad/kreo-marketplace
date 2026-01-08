import { IsUUID, IsNumber, IsOptional, IsObject, Min, Max } from 'class-validator';

/**
 * DTO para crear Payment Intent
 */
export class CreatePaymentIntentDto {
  @IsUUID('4', { message: 'order_id debe ser un UUID válido' })
  order_id: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount debe ser un número con máximo 2 decimales' })
  @Min(0.50, { message: 'Monto mínimo es $0.50' })
  @Max(999999.99, { message: 'Monto máximo es $999,999.99' })
  amount: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'application_fee debe ser un número con máximo 2 decimales' })
  @Min(0, { message: 'application_fee no puede ser negativo' })
  application_fee: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
