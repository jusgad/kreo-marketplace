import { IsEmail, IsString, MinLength, IsOptional, IsIn, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial' }
  )
  password: string;

  @IsOptional()
  @IsIn(['customer', 'vendor'])
  role?: 'customer' | 'vendor';

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim().replace(/<[^>]*>/g, '')) // Remove HTML tags
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim().replace(/<[^>]*>/g, '')) // Remove HTML tags
  last_name?: string;
}
