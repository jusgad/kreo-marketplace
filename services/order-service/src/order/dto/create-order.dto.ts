import { IsEmail, IsObject, ValidateNested, IsString, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para dirección
 */
export class AddressDto {
  @IsString()
  @MaxLength(200, { message: 'La calle no puede exceder 200 caracteres' })
  street: string;

  @IsString()
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  city: string;

  @IsString()
  @MaxLength(100, { message: 'El estado/provincia no puede exceder 100 caracteres' })
  state: string;

  @IsString()
  @MaxLength(2, { message: 'El código de país debe ser de 2 letras (ISO 3166-1 alpha-2)' })
  @Matches(/^[A-Z]{2}$/, { message: 'Código de país inválido (debe ser 2 letras mayúsculas, ej: US, MX, CA)' })
  country: string;

  @IsString()
  @MaxLength(20, { message: 'El código postal no puede exceder 20 caracteres' })
  zip_code: string;
}

/**
 * DTO para crear orden desde el carrito
 */
export class CreateOrderDto {
  @IsEmail({}, { message: 'Email debe ser válido' })
  email: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  shipping_address: AddressDto;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  billing_address: AddressDto;
}
