import type Stripe from 'stripe';

// Base checkout session parameters
export class BaseCheckoutSessionDto {
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    customerId?: string;
    clientReferenceId?: string;
    paymentMethodTypes?: Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
    metadata?: Record<string, string | number>;
    allowPromotionCodes?: boolean;
    locale?: Stripe.Checkout.SessionCreateParams.Locale;
    customerCreation?: 'always' | 'if_required';
    taxAutoCalculation?: boolean;
    shippingAddressCollection?: {
        allowed_countries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
    };
    billingAddressCollection?: Stripe.Checkout.SessionCreateParams.BillingAddressCollection;
}

// Payment-specific line item
export interface PaymentLineItem {
    price?: string;
    quantity?: number;
    adjustableQuantity?: {
        enabled: boolean;
        minimum?: number;
        maximum?: number;
    };
    // Additional payment-specific fields
    amount?: number;
    currency?: string;
    name?: string;
    description?: string;
}

// Subscription-specific line item
export interface SubscriptionLineItem {
    price: string;
    quantity?: number;
    adjustableQuantity?: {
        enabled: boolean;
        minimum?: number;
        maximum?: number;
    };
}

// Payment checkout session parameters
export class PaymentCheckoutSessionDto extends BaseCheckoutSessionDto {
    lineItems: PaymentLineItem[];
    submitType?: Stripe.Checkout.SessionCreateParams.SubmitType;
    phoneNumberCollection?: boolean;
    paymentIntentData?: {
        description?: string;
        receiptEmail?: string;
        statementDescriptor?: string;
        applicationFeeAmount?: number;
    };
}

// Subscription checkout session parameters
export class SubscriptionCheckoutSessionDto extends BaseCheckoutSessionDto {
    lineItems: SubscriptionLineItem[];
    trialPeriodDays?: number;
    subscriptionData?: {
        description?: string;
        metadata?: Record<string, string | number>;
        transferData?: {
            destination: string;
            amount_percent?: number;
        };
    };
}