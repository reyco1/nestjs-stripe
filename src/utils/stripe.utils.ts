// src/utils/stripe.utils.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { STRIPE_CLIENT_TOKEN } from '../stripe.constants';
import Stripe from 'stripe';
import {
    StripeUtilitiesInterface,
    CustomerDetails,
    PaymentMethodDetails,
    RefundInfo,
    SubscriptionDetails
} from '../interfaces/stripe-utilities.interface';

@Injectable()
export class StripeUtils implements StripeUtilitiesInterface {
    private readonly logger = new Logger(StripeUtils.name);

    constructor(
        @Inject(STRIPE_CLIENT_TOKEN) private readonly stripeClient: Stripe
    ) { }

    /**
     * Extracts customer details from various Stripe objects
     * Always attempts to fetch full customer details when possible
     */
    async getCustomerDetails(
        object: Stripe.PaymentIntent | Stripe.Charge | Stripe.Subscription | (Stripe.Customer | Stripe.DeletedCustomer)
    ): Promise<CustomerDetails> {
        try {
            let customerId: string | undefined;

            // Extract the customer ID based on object type
            if (this.isCustomer(object)) {
                customerId = object.id;
            } else if (this.isPaymentIntent(object) || this.isCharge(object)) {
                const customer = object.customer;
                customerId = typeof customer === 'string' ? customer : customer?.id;
            } else if (this.isSubscription(object)) {
                customerId = object.customer as string;
            }

            // If we have a customer ID, try to fetch full customer details
            if (customerId) {
                try {
                    const customer = await this.stripeClient.customers.retrieve(customerId);

                    if (this.isDeletedCustomer(customer)) {
                        return { customerId: customer.id };
                    }

                    return {
                        customerId: customer.id,
                        email: customer.email ?? undefined,
                        name: customer.name ?? undefined,
                        phone: customer.phone ?? undefined,
                        metadata: customer.metadata ? { ...customer.metadata } : undefined,
                    };
                } catch (error) {
                    this.logger.warn(`Failed to fetch customer details for ID ${customerId}: ${error.message}`);
                    return { customerId };
                }
            }

            // Fallback: If we can't get the customer ID or fetch fails, return what we can from the original object
            if (this.isCustomer(object)) {
                if (this.isDeletedCustomer(object)) {
                    return { customerId: object.id };
                }
                return {
                    customerId: object.id,
                    email: object.email ?? undefined,
                    name: object.name ?? undefined,
                    phone: object.phone ?? undefined,
                    metadata: object.metadata ? { ...object.metadata } : undefined,
                };
            }

            return {};
        } catch (error) {
            this.logger.error(`Error getting customer details: ${error.message}`);
            return {};
        }
    }

    /**
     * Extracts receipt URL from a Payment Intent, Charge, or Invoice
     */
    async getReceiptUrl(object: Stripe.PaymentIntent | Stripe.Charge | Stripe.Invoice): Promise<string | undefined> {
        try {
            if (this.isCharge(object)) {
                // Fetch fresh charge data to ensure we have the latest receipt URL
                const charge = await this.stripeClient.charges.retrieve(object.id);
                return charge.receipt_url;
            }

            if (this.isPaymentIntent(object)) {
                // Fetch fresh payment intent to get the latest charge
                const paymentIntent = await this.stripeClient.paymentIntents.retrieve(object.id, {
                    expand: ['latest_charge']
                });

                if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge !== 'string') {
                    return paymentIntent.latest_charge.receipt_url;
                }

                return paymentIntent.latest_charge ?
                    `https://dashboard.stripe.com/payments/${paymentIntent.latest_charge}` :
                    undefined;
            }

            if (this.isInvoice(object)) {
                // Fetch fresh invoice data
                const invoice = await this.stripeClient.invoices.retrieve(object.id);
                return invoice.hosted_invoice_url;
            }

            return undefined;
        } catch (error) {
            this.logger.error(`Error getting receipt URL: ${error.message}`);
            return undefined;
        }
    }

    /**
     * Gets detailed payment method information
     */
    async getPaymentMethodDetails(
        object: Stripe.PaymentIntent | Stripe.Charge | Stripe.PaymentMethod | string
    ): Promise<PaymentMethodDetails> {
        try {
            let paymentMethodId: string | undefined;

            // Extract payment method ID based on input type
            if (typeof object === 'string') {
                paymentMethodId = object;
            } else if (this.isPaymentMethod(object)) {
                paymentMethodId = object.id;
            } else if (this.isPaymentIntent(object)) {
                paymentMethodId = typeof object.payment_method === 'string' ?
                    object.payment_method :
                    object.payment_method?.id;
            } else if (this.isCharge(object)) {
                paymentMethodId = typeof object.payment_method === 'string' ?
                    object.payment_method :
                    undefined;
            }

            // If we have a payment method ID, fetch full details
            if (paymentMethodId) {
                try {
                    const paymentMethod = await this.stripeClient.paymentMethods.retrieve(paymentMethodId);

                    if (paymentMethod.type === 'card' && paymentMethod.card) {
                        return {
                            id: paymentMethod.id,
                            type: paymentMethod.type,
                            last4: paymentMethod.card.last4,
                            brand: paymentMethod.card.brand,
                            expMonth: paymentMethod.card.exp_month,
                            expYear: paymentMethod.card.exp_year,
                            billingDetails: paymentMethod.billing_details,
                            metadata: paymentMethod.metadata,
                        };
                    }

                    return {
                        id: paymentMethod.id,
                        type: paymentMethod.type,
                        billingDetails: paymentMethod.billing_details,
                        metadata: paymentMethod.metadata,
                    };
                } catch (error) {
                    this.logger.warn(`Failed to fetch payment method details for ID ${paymentMethodId}: ${error.message}`);
                }
            }

            // Fallback to original object data if fetch fails
            if (this.isPaymentMethod(object)) {
                if (object.type === 'card' && object.card) {
                    return {
                        id: object.id,
                        type: object.type,
                        last4: object.card.last4,
                        brand: object.card.brand,
                        expMonth: object.card.exp_month,
                        expYear: object.card.exp_year,
                        billingDetails: object.billing_details,
                        metadata: object.metadata,
                    };
                }
            }

            return {};
        } catch (error) {
            this.logger.error(`Error getting payment method details: ${error.message}`);
            return {};
        }
    }

    /**
     * Gets comprehensive refund information for a payment
     */
    async getRefundInfo(object: Stripe.Charge | Stripe.PaymentIntent): Promise<RefundInfo> {
        try {
            let chargeId: string | undefined;

            if (this.isCharge(object)) {
                chargeId = object.id;
            } else if (this.isPaymentIntent(object)) {
                const paymentIntent = await this.stripeClient.paymentIntents.retrieve(object.id, {
                    expand: ['latest_charge']
                });
                chargeId = typeof paymentIntent.latest_charge === 'string' ?
                    paymentIntent.latest_charge :
                    paymentIntent.latest_charge?.id;
            }

            if (chargeId) {
                const charge = await this.stripeClient.charges.retrieve(chargeId, {
                    expand: ['refunds']
                });

                return {
                    refunded: charge.refunded,
                    refundedAmount: charge.amount_refunded,
                    refundCount: charge.refunds?.data?.length ?? 0,
                    refunds: charge.refunds?.data?.map(refund => ({
                        id: refund.id,
                        amount: refund.amount,
                        status: refund.status,
                        reason: refund.reason ?? undefined,
                        created: new Date(refund.created * 1000),
                        metadata: refund.metadata,
                    })),
                };
            }

            return { refunded: false };
        } catch (error) {
            this.logger.error(`Error getting refund info: ${error.message}`);
            return { refunded: false };
        }
    }

    /**
     * Gets full subscription details including current period and trial information
     */
    async getSubscriptionDetails(object: Stripe.Subscription | string): Promise<SubscriptionDetails> {
        try {
            const subscriptionId = typeof object === 'string' ? object : object.id;
            const subscription = await this.stripeClient.subscriptions.retrieve(subscriptionId, {
                expand: ['items']
            });

            return {
                id: subscription.id,
                status: this.standardizeSubscriptionStatus(subscription.status),
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
                trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
                cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
                endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
                metadata: subscription.metadata,
                items: subscription.items.data.map(item => ({
                    id: item.id,
                    priceId: typeof item.price === 'string' ? item.price : item.price.id,
                    quantity: item.quantity,
                    metadata: item.metadata,
                })),
            };
        } catch (error) {
            this.logger.error(`Error getting subscription details: ${error.message}`);
            throw error;
        }
    }

    /**
     * Formats currency amounts consistently
     */
    formatAmount(amount: number, currency: string = 'usd'): string {
        try {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency.toUpperCase(),
                minimumFractionDigits: 2,
            });

            return formatter.format(amount / 100);
        } catch (error) {
            this.logger.error(`Error formatting amount: ${error.message}`);
            return `${(amount / 100).toFixed(2)}`;
        }
    }

    // Type guards
    private isPaymentIntent(object: any): object is Stripe.PaymentIntent {
        return object?.object === 'payment_intent';
    }

    private isCharge(object: any): object is Stripe.Charge {
        return object?.object === 'charge';
    }

    private isInvoice(object: any): object is Stripe.Invoice {
        return object?.object === 'invoice';
    }

    private isCustomer(object: any): object is (Stripe.Customer | Stripe.DeletedCustomer) {
        return object?.object === 'customer';
    }

    private isDeletedCustomer(object: any): object is Stripe.DeletedCustomer {
        return object?.deleted === true;
    }

    private isSubscription(object: any): object is Stripe.Subscription {
        return object?.object === 'subscription';
    }

    private isPaymentMethod(object: any): object is Stripe.PaymentMethod {
        return object?.object === 'payment_method';
    }

    // Status standardization helpers
    private standardizePaymentIntentStatus(status: Stripe.PaymentIntent.Status): string {
        const statusMap: Record<Stripe.PaymentIntent.Status, string> = {
            requires_payment_method: 'pending',
            requires_confirmation: 'pending',
            requires_action: 'pending',
            processing: 'processing',
            requires_capture: 'authorized',
            canceled: 'canceled',
            succeeded: 'succeeded',
        };
        return statusMap[status] || status;
    }

    private standardizeChargeStatus(status: string): string {
        const statusMap: Record<string, string> = {
            succeeded: 'succeeded',
            pending: 'pending',
            failed: 'failed',
        };
        return statusMap[status] || status;
    }

    private standardizeSubscriptionStatus(status: Stripe.Subscription.Status): string {
        const statusMap: Record<Stripe.Subscription.Status, string> = {
            incomplete: 'pending',
            incomplete_expired: 'failed',
            trialing: 'trialing',
            active: 'active',
            past_due: 'past_due',
            canceled: 'canceled',
            unpaid: 'unpaid',
            paused: 'paused',
        };
        return statusMap[status] || status;
    }
}