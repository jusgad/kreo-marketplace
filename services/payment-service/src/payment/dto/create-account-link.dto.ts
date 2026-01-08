import { IsString, IsUrl, Matches } from 'class-validator';

/**
 * DTO para crear link de onboarding de cuenta Stripe
 */
export class CreateAccountLinkDto {
  @IsString()
  @Matches(/^acct_[a-zA-Z0-9]+$/, {
    message: 'account_id debe ser un ID válido de Stripe (acct_...)'
  })
  account_id: string;

  @IsUrl({}, { message: 'refresh_url debe ser una URL válida' })
  refresh_url: string;

  @IsUrl({}, { message: 'return_url debe ser una URL válida' })
  return_url: string;
}
