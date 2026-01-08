import { IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class Verify2FADto {
  @IsString()
  @Length(6, 6, { message: 'El código 2FA debe tener exactamente 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'El código 2FA debe contener solo dígitos' })
  @Transform(({ value }) => value?.trim())
  token: string;
}
