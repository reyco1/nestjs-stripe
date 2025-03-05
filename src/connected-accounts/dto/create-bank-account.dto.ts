export class CreateBankAccountDto {
    country: string;
    currency: string;
    accountNumber: string;
    routingNumber?: string;
    accountHolderName: string;
    accountHolderType?: 'individual' | 'company';
  }