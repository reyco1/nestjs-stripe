import Stripe from "stripe";

export interface StripeConfig {
    apiKey: string;
    webhookSecret?: string;
    apiVersion?: Stripe.LatestApiVersion;
}