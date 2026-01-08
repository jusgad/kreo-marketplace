import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

/**
 * DTO para crear cuenta conectada de Stripe
 */
export class CreateAccountDto {
  @IsEmail({}, { message: 'Email debe ser válido' })
  email: string;

  @IsOptional()
  @IsString()
  @IsIn(['US', 'CA', 'GB', 'AU', 'MX', 'ES', 'FR', 'DE', 'IT'], {
    message: 'Código de país no soportado'
  })
  country?: string = 'US';
}
