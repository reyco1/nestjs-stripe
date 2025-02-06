import { STRIPE_CLIENT_TOKEN, STRIPE_CONFIG_TOKEN } from './stripe.constants';
import { StripeConfig } from './interfaces/stripe-config.interface';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@Module({})
export class StripeModule {
  static forRoot(config: StripeConfig): DynamicModule {
    const stripeProvider: Provider = {
      provide: STRIPE_CLIENT_TOKEN,
      useValue: new Stripe(config.apiKey, {
        apiVersion: config.apiVersion || '2025-01-27.acacia',
      }),
    };

    const configProvider: Provider = {
      provide: STRIPE_CONFIG_TOKEN,
      useValue: config,
    };

    return {
      module: StripeModule,
      providers: [stripeProvider, configProvider, StripeService],
      exports: [StripeService],
      global: true,
    };
  }
}