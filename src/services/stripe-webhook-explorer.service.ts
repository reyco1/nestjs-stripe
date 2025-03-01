// src/services/stripe-webhook-explorer.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { STRIPE_WEBHOOK_HANDLER, StripeWebhookHandlerMetadata } from '../decorators/stripe-webhook-handler.decorator';
import Stripe from 'stripe';

interface WebhookHandlerInfo {
    instance: any;
    methodName: string;
    eventName: string;
}

@Injectable()
export class StripeWebhookExplorerService implements OnModuleInit {
    private readonly logger = new Logger(StripeWebhookExplorerService.name);
    private webhookHandlers: Map<string, WebhookHandlerInfo[]> = new Map();

    constructor(
        private readonly discoveryService: DiscoveryService,
        private readonly metadataScanner: MetadataScanner,
    ) { }

    onModuleInit() {
        this.explore();
    }

    /**
     * Explores all providers to find methods decorated with @StripeWebhookHandler
     */
    private explore() {
        const providers = this.discoveryService.getProviders();

        providers.forEach((wrapper: InstanceWrapper) => {
            const { instance } = wrapper;

            if (!instance || typeof instance !== 'object') {
                return;
            }

            this.metadataScanner.scanFromPrototype(
                instance,
                Object.getPrototypeOf(instance),
                (methodName: string) => this.lookupWebhookHandlers(instance, methodName),
            );
        });

        // Log discovered handlers
        this.webhookHandlers.forEach((handlers, eventName) => {
            this.logger.log(`Discovered ${handlers.length} handler(s) for webhook event: ${eventName}`);
        });
    }

    /**
     * Checks if a method is decorated with @StripeWebhookHandler and registers it
     */
    private lookupWebhookHandlers(instance: any, methodName: string) {
        const methodRef = instance[methodName];

        // Get metadata from the webhook handler decorator if it exists
        const metadata = Reflect.getMetadata(STRIPE_WEBHOOK_HANDLER, methodRef) as StripeWebhookHandlerMetadata;

        if (metadata) {
            const { eventName } = metadata;

            if (!this.webhookHandlers.has(eventName)) {
                this.webhookHandlers.set(eventName, []);
            }

            this.webhookHandlers.get(eventName).push({
                instance,
                methodName,
                eventName,
            });

            this.logger.debug(`Registered webhook handler: ${instance.constructor.name}.${methodName} for event: ${eventName}`);
        }
    }

    /**
     * Processes a Stripe webhook event by executing all registered handlers for the event type
     */
    async processWebhookEvent(event: Stripe.Event): Promise<boolean> {
        const handlers = this.webhookHandlers.get(event.type) || [];

        if (handlers.length === 0) {
            this.logger.warn(`No handlers registered for webhook event: ${event.type}`);
            return false;
        }

        const promises = handlers.map(async (handler) => {
            const { instance, methodName } = handler;

            try {
                this.logger.debug(`Executing handler: ${instance.constructor.name}.${methodName} for event: ${event.type}`);
                await instance[methodName](event);
            } catch (error) {
                this.logger.error(
                    `Error in webhook handler ${instance.constructor.name}.${methodName} for event ${event.type}: ${error.message}`,
                    error.stack,
                );
                throw error;
            }
        });

        await Promise.all(promises);
        return true;
    }
}