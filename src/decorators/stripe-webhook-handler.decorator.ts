// src/decorators/stripe-webhook-handler.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const STRIPE_WEBHOOK_HANDLER = 'STRIPE_WEBHOOK_HANDLER';

export interface StripeWebhookHandlerMetadata {
    eventName: string;
}

/**
 * Decorator for methods that should handle specific Stripe webhook events.
 * 
 * @param eventName The Stripe event name to handle (e.g., 'customer.subscription.updated')
 * @returns A method decorator
 * 
 * @example
 * @StripeWebhookHandler('customer.subscription.updated')
 * async handleSubscriptionUpdate(event: Stripe.Event): Promise<void> {
 *   const subscription = event.data.object as Stripe.Subscription;
 *   // Process subscription update
 * }
 */
export const StripeWebhookHandler = (eventName: string) =>
    SetMetadata<string, StripeWebhookHandlerMetadata>(STRIPE_WEBHOOK_HANDLER, { eventName });