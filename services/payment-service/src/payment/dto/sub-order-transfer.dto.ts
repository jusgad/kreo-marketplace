import { IsUUID, IsString, IsNumber, Matches, Min, Max } from 'class-validator';

/**
 * DTO para transferencia de sub-orden individual
 */
export class SubOrderTransferDto {
  @IsUUID('4', { message: 'vendor_id debe ser un UUID válido' })
  vendor_id: string;

  @IsString()
  @Matches(/^acct_[a-zA-Z0-9]+$/, {
    message: 'stripe_account_id debe ser un ID válido de Stripe (acct_...)'
  })
  stripe_account_id: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'vendor_payout debe ser un número con máximo 2 decimales' })
  @Min(0.50, { message: 'Payout mínimo es $0.50' })
  @Max(999999.99, { message: 'Payout máximo es $999,999.99' })
  vendor_payout: number;

  @IsUUID('4', { message: 'sub_order_id debe ser un UUID válido' })
  sub_order_id: string;
}
