// src/controllers/stripe-webhook.controller.ts
import {
    Controller,
    Post,
    Headers,
    RawBodyRequest,
    Req,
    HttpCode,
    HttpStatus,
    Logger,
    Inject
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../stripe.service';
import { StripeWebhookExplorerService } from '../services/stripe-webhook-explorer.service';
import { STRIPE_CONFIG_TOKEN } from '../stripe.constants';
import { StripeConfig } from '../interfaces/stripe-config.interface';
import Stripe from 'stripe';

@Controller('stripe/webhook')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly webhookExplorerService: StripeWebhookExplorerService,
        @Inject(STRIPE_CONFIG_TOKEN) private readonly stripeConfig: StripeConfig,
    ) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() request: RawBodyRequest<Request>,
    ) {
        try {
            if (!signature) {
                this.logger.warn('Missing Stripe signature header');
                return { success: false, message: 'Missing signature header' };
            }

            if (!this.stripeConfig.webhookSecret) {
                this.logger.error('Webhook secret is not configured');
                return { success: false, message: 'Webhook secret not configured' };
            }

            // Get raw body buffer
            const payload = request.rawBody;
            if (!payload) {
                this.logger.warn('Missing request body');
                return { success: false, message: 'Missing request body' };
            }

            // Construct and validate the event
            const event = await this.stripeService.createWebhookEvent(
                payload,
                signature,
                this.stripeConfig.webhookSecret,
            );

            this.logger.log(`Received webhook event: ${event.type} [${event.id}]`);

            // Process the event with registered handlers
            const processed = await this.webhookExplorerService.processWebhookEvent(event);

            return {
                success: true,
                processed,
                eventType: event.type,
                eventId: event.id,
            };
        } catch (error) {
            if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
                this.logger.warn(`Webhook signature verification failed: ${error.message}`);
                return {
                    success: false,
                    message: 'Webhook signature verification failed',
                };
            }

            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
            return {
                success: false,
                message: 'Error processing webhook',
            };
        }
    }
}