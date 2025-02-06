export class CreatePaymentDto {
    amount: number;
    currency: string;
    metadata?: Record<string, string | number>;
    description?: string;
}