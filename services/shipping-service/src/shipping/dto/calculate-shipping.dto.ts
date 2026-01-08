import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';

export class CalculateShippingDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number; // Weight in kg

  @IsString()
  zipCode: string;

  @IsString()
  @IsOptional()
  country?: string; // ISO country code

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsArray()
  @IsOptional()
  items?: Array<{
    id: string;
    weight?: number;
    quantity: number;
  }>;
}
