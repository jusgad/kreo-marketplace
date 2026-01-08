import { IsUUID, IsNumber, Min, Max } from 'class-validator';

export class ReserveInventoryItemDto {
  @IsUUID('4', { message: 'product_id debe ser un UUID válido' })
  product_id: string;

  @IsNumber()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(1000, { message: 'No se pueden reservar más de 1000 unidades' })
  quantity: number;
}
