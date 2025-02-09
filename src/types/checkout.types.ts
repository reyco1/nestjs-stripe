import type Stripe from 'stripe';

export type AllowedCountry = Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry;
export type PaymentMethodType = Stripe.Checkout.SessionCreateParams.PaymentMethodType;
export type Locale = Stripe.Checkout.SessionCreateParams.Locale;
export type BillingAddressCollection = Stripe.Checkout.SessionCreateParams.BillingAddressCollection;
export type SubmitType = Stripe.Checkout.SessionCreateParams.SubmitType;

// Common country codes for reference
export const COMMON_COUNTRIES: AllowedCountry[] = [
    'US', // United States
    'CA', // Canada
    'GB', // United Kingdom
    'AU', // Australia
    'DE', // Germany
    'FR', // France
    'IT', // Italy
    'ES', // Spain
    'NL', // Netherlands
    'BE', // Belgium
    'IE', // Ireland
    'NZ', // New Zealand
];