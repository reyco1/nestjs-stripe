// src/interfaces/stripe-utilities.interface.ts
import Stripe from 'stripe';

export interface CustomerDetails {
    customerId?: string;
    email?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
}

export interface PaymentMethodDetails {
    id?: string;
    type?: string;
    last4?: string;
    brand?: string;
    expMonth?: number;
    expYear?: number;
    billingDetails?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: Stripe.Address;
    };
    metadata?: Record<string, string>;
}

export interface RefundInfo {
    refunded: boolean;
    refundedAmount?: number;
    refundCount?: number;
    refunds?: Array<{
        id: string;
        amount: number;
        status: string;
        reason?: string;
        created: Date;
        metadata?: Record<string, string>;
    }>;
}

export interface SubscriptionItemDetails {
    id: string;
    priceId: string;
    quantity?: number;
    metadata?: Record<string, string>;
}

export interface SubscriptionDetails {
    id: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialStart?: Date;
    trialEnd?: Date;
    cancelAt?: Date;
    canceledAt?: Date;
    endedAt?: Date;
    metadata?: Record<string, string>;
    items?: SubscriptionItemDetails[];
}

export interface StripeUtilitiesInterface {
    getCustomerDetails(
        object: Stripe.PaymentIntent | Stripe.Charge | Stripe.Subscription | (Stripe.Customer | Stripe.DeletedCustomer)
    ): Promise<CustomerDetails>;

    getReceiptUrl(
        object: Stripe.PaymentIntent | Stripe.Charge | Stripe.Invoice
    ): Promise<string | undefined>;

    getPaymentMethodDetails(
        object: Stripe.PaymentIntent | Stripe.Charge | Stripe.PaymentMethod | string
    ): Promise<PaymentMethodDetails>;

    getRefundInfo(
        object: Stripe.Charge | Stripe.PaymentIntent
    ): Promise<RefundInfo>;

    getSubscriptionDetails(
        object: Stripe.Subscription | string
    ): Promise<SubscriptionDetails>;

    formatAmount(
        amount: number,
        currency?: string
    ): string;
}