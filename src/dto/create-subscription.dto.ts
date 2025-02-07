export class CreateSubscriptionDto {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string | number>;
    description?: string;
}