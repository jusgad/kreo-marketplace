import { IsArray, ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ReserveInventoryItemDto } from './reserve-inventory-item.dto';

/**
 * DTO para reservar inventario de múltiples productos de forma atómica
 *
 * Este DTO es usado por order-service para reservar stock antes de crear una orden.
 * La reserva es atómica y previene race conditions/overselling.
 */
export class ReserveInventoryDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe haber al menos 1 producto para reservar' })
  @ArrayMaxSize(100, { message: 'No se pueden reservar más de 100 productos a la vez' })
  @ValidateNested({ each: true })
  @Type(() => ReserveInventoryItemDto)
  items: ReserveInventoryItemDto[];
}
