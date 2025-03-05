export class CreateConnectedAccountDto {
    email: string;
    country: string;
    businessType?: 'individual' | 'company' | 'non_profit' | 'government_entity';
    capabilities?: {
      card_payments?: { requested: boolean };
      transfers?: { requested: boolean };
      // Other capabilities as needed
    };
    businessProfile?: {
      mcc?: string;
      url?: string;
      product_description?: string;
    };
    metadata?: Record<string, string | number>;
  }