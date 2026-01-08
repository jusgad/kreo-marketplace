import { IsArray, IsUUID, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para obtener múltiples productos en una sola petición
 */
export class GetProductsBatchDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe solicitar al menos 1 producto' })
  @ArrayMaxSize(100, { message: 'No se pueden solicitar más de 100 productos a la vez' })
  @IsUUID('4', { each: true, message: 'Todos los IDs deben ser UUIDs válidos' })
  @Transform(({ value }) => {
    // Permitir enviar como string separado por comas o array
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim()).filter(Boolean);
    }
    return value;
  })
  ids: string[];
}
