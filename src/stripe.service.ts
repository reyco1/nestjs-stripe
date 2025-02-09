import { PaymentCheckoutSessionDto, SubscriptionCheckoutSessionDto } from './dto/checkout-session.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { STRIPE_CLIENT_TOKEN } from './stripe.constants';
import Stripe from 'stripe';

@Injectable()
export class StripeService {

  private readonly logger = new Logger(StripeService.name);

  constructor(
    @Inject(STRIPE_CLIENT_TOKEN) private readonly stripeClient: Stripe,
  ) { }

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>) {
    const customer = await this.stripeClient.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  }

  async createPaymentCheckoutSession(params: PaymentCheckoutSessionDto): Promise<Stripe.Checkout.Session> {
    try {
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        line_items: params.lineItems.map(item => ({
          price: item.price,
          quantity: item.quantity,
          adjustable_quantity: item.adjustableQuantity ? {
            enabled: item.adjustableQuantity.enabled,
            minimum: item.adjustableQuantity.minimum,
            maximum: item.adjustableQuantity.maximum,
          } : undefined,
          price_data: !item.price ? {
            currency: item.currency,
            unit_amount: item.amount,
            product_data: {
              name: item.name,
              description: item.description,
            },
          } : undefined,
        })),
        customer_email: params.customerEmail,
        ...(params.customerId ? {
          customer: params.customerId
        } : {
          customer_creation: params.customerCreation || 'if_required'
        }),
        client_reference_id: params.clientReferenceId,
        payment_method_types: params.paymentMethodTypes,
        metadata: params.metadata,
        allow_promotion_codes: params.allowPromotionCodes,
        locale: params.locale,
        automatic_tax: params.taxAutoCalculation ? { enabled: true } : undefined,
        shipping_address_collection: params.shippingAddressCollection ? {
          allowed_countries: params.shippingAddressCollection.allowed_countries,
        } : undefined,
        billing_address_collection: params.billingAddressCollection,
        submit_type: params.submitType,
        phone_number_collection: params.phoneNumberCollection ? { enabled: true } : undefined,
        payment_intent_data: params.paymentIntentData,
      };

      const session = await this.stripeClient.checkout.sessions.create(sessionConfig);
      this.logger.debug(`Created payment checkout session: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating payment checkout session: ${error.message}`);
      throw error;
    }
  }

  async createSubscriptionCheckoutSession(params: SubscriptionCheckoutSessionDto): Promise<Stripe.Checkout.Session> {
    try {
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        line_items: params.lineItems.map(item => ({
          price: item.price,
          quantity: item.quantity,
          adjustable_quantity: item.adjustableQuantity ? {
            enabled: item.adjustableQuantity.enabled,
            minimum: item.adjustableQuantity.minimum,
            maximum: item.adjustableQuantity.maximum,
          } : undefined,
        })),
        customer_email: params.customerEmail,
        ...(params.customerId ? {
          customer: params.customerId
        } : {
          customer_creation: params.customerCreation || 'if_required'
        }),
        client_reference_id: params.clientReferenceId,
        payment_method_types: params.paymentMethodTypes,
        metadata: params.metadata,
        allow_promotion_codes: params.allowPromotionCodes,
        locale: params.locale,
        automatic_tax: params.taxAutoCalculation ? { enabled: true } : undefined,
        shipping_address_collection: params.shippingAddressCollection ? {
          allowed_countries: params.shippingAddressCollection.allowed_countries,
        } : undefined,
        billing_address_collection: params.billingAddressCollection,
        subscription_data: params.subscriptionData ? {
          description: params.subscriptionData.description,
          metadata: params.subscriptionData.metadata,
          trial_period_days: params.trialPeriodDays,
          transfer_data: params.subscriptionData.transferData,
        } : undefined,
      };

      const session = await this.stripeClient.checkout.sessions.create(sessionConfig);
      this.logger.debug(`Created subscription checkout session: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating subscription checkout session: ${error.message}`);
      throw error;
    }
  }

  async createPaymentIntent(data: CreatePaymentDto) {
    const paymentIntent = await this.stripeClient.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      payment_method_types: ['card'],
      metadata: data.metadata,
      description: data.description,
    });

    return paymentIntent;
  }

  async createSubscription(data: CreateSubscriptionDto) {
    const subscription = await this.stripeClient.subscriptions.create({
      customer: data.customerId,
      items: [{ price: data.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: data.metadata,
      description: data.description,
    });

    return subscription;
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripeClient.subscriptions.cancel(subscriptionId);
  }

  async retrieveSubscription(subscriptionId: string) {
    return this.stripeClient.subscriptions.retrieve(subscriptionId);
  }

  async createWebhookEvent(payload: Buffer, signature: string, webhookSecret: string) {
    return this.stripeClient.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}