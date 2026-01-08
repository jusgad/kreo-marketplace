import { IsUUID, IsArray, ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { SubOrderTransferDto } from './sub-order-transfer.dto';

/**
 * DTO para ejecutar transferencias a vendors
 */
export class ExecuteTransfersDto {
  @IsUUID('4', { message: 'order_id debe ser un UUID válido' })
  order_id: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe haber al menos 1 sub-orden' })
  @ArrayMaxSize(50, { message: 'No se pueden procesar más de 50 sub-órdenes a la vez' })
  @ValidateNested({ each: true })
  @Type(() => SubOrderTransferDto)
  sub_orders: SubOrderTransferDto[];
}
