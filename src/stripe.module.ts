import { STRIPE_CLIENT_TOKEN, STRIPE_CONFIG_TOKEN } from './stripe.constants';
import { StripeConfig } from './interfaces/stripe-config.interface';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import { StripeModuleAsyncOptions, StripeOptionsFactory } from './interfaces/stripe-module-async-options.interface';

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

  static forRootAsync(options: StripeModuleAsyncOptions): DynamicModule {
    const stripeProvider: Provider = {
      provide: STRIPE_CLIENT_TOKEN,
      useFactory: (config: StripeConfig) => {
        return new Stripe(config.apiKey, {
          apiVersion: config.apiVersion || '2025-01-27.acacia',
        });
      },
      inject: [STRIPE_CONFIG_TOKEN],
    };

    return {
      module: StripeModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        stripeProvider,
        StripeService,
      ],
      exports: [StripeService],
      global: true,
    };
  }

  private static createAsyncProviders(options: StripeModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncConfigProvider(options)];
    }

    return [
      this.createAsyncConfigProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncConfigProvider(options: StripeModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: STRIPE_CONFIG_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: STRIPE_CONFIG_TOKEN,
      useFactory: async (optionsFactory: StripeOptionsFactory) =>
        await optionsFactory.createStripeOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}