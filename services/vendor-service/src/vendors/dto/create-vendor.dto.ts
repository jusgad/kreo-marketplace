import { IsString, IsUUID, IsOptional, MaxLength, IsEnum } from 'class-validator';

export class CreateVendorDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MaxLength(200)
  businessName: string;

  @IsString()
  @IsOptional()
  @IsEnum(['individual', 'company', 'llc'])
  businessType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  businessDescription?: string;
}
