import { Inject, Injectable } from '@nestjs/common';
import { STRIPE_CLIENT_TOKEN, STRIPE_CONFIG_TOKEN } from './stripe.constants';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { StripeConfig } from './interfaces/stripe-config.interface';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  constructor(
    @Inject(STRIPE_CLIENT_TOKEN) private readonly stripeClient: Stripe,
    @Inject(STRIPE_CONFIG_TOKEN) private readonly stripeConfig: StripeConfig
  ) {}

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

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>) {
    const customer = await this.stripeClient.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
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