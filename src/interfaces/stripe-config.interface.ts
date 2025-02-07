import Stripe from "stripe";

export interface StripeConfig {
    apiKey: string | undefined;
    webhookSecret?: string | undefined;
    apiVersion?: Stripe.LatestApiVersion | undefined;
}