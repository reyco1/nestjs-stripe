// src/modules/stripe-webhook.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { StripeWebhookController } from '../controllers/stripe-webhook.controller';
import { StripeWebhookExplorerService } from '../services/stripe-webhook-explorer.service';

@Module({})
export class StripeWebhookModule {
  static forRoot(): DynamicModule {
    return {
      module: StripeWebhookModule,
      imports: [DiscoveryModule],
      controllers: [StripeWebhookController],
      providers: [StripeWebhookExplorerService],
      exports: [StripeWebhookExplorerService],
    };
  }
}