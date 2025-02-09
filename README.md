# @reyco1/nestjs-stripe

<div align="center">
  <img src="https://nestjs.com/img/logo-small.svg" height="120" alt="Nest Logo" />
  <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" height="120" alt="Stripe Logo" style="margin-left: 20px" />
</div>

A powerful NestJS module for Stripe integration that supports both one-time payments and subscriptions. This package provides a seamless way to integrate Stripe payment processing into your NestJS application.

## Table of Contents

- [@reyco1/nestjs-stripe](#reyco1nestjs-stripe)
  - [Table of Contents](#table-of-contents)
  - [Overview 🛠️](#overview-️)
  - [Features ✨](#features-)
  - [Installation 📦](#installation-)
  - [Basic Usage 💡](#basic-usage-)
    - [Using StripeService (Core Operations)](#using-stripeservice-core-operations)
    - [Using StripeUtils (Enhanced Data Handling)](#using-stripeutils-enhanced-data-handling)
    - [Using Raw Stripe Client](#using-raw-stripe-client)
  - [Configuration ⚙️](#configuration-️)
    - [Module Configuration](#module-configuration)
  - [Checkout Sessions 🛍️](#checkout-sessions-️)
    - [Payment Checkout](#payment-checkout)
    - [Subscription Checkout](#subscription-checkout)
    - [Customer Creation Behavior](#customer-creation-behavior)
    - [Configuration Options](#configuration-options)
  - [Utility Methods 🛠️](#utility-methods-️)
    - [Customer Details](#customer-details)
    - [Payment Method Details](#payment-method-details)
    - [Refund Information](#refund-information)
    - [Subscription Details](#subscription-details)
    - [Amount Formatting](#amount-formatting)
  - [Payment Operations 💳](#payment-operations-)
    - [Creating One-Time Payments](#creating-one-time-payments)
  - [Subscription Management 📅](#subscription-management-)
  - [Webhook Handling 🎣](#webhook-handling-)
  - [Contributing 🤝](#contributing-)
  - [License 📄](#license-)

## Overview 🛠️

When installed, this package will:

1. Add required imports to your `app.module.ts`:
   - ConfigService from @nestjs/config
   - StripeModule from @reyco1/nestjs-stripe

2. Configure the StripeModule with async configuration using ConfigService

3. Add necessary environment variables to your `.env` and `.env.example` files:
   ```env
   STRIPE_API_KEY=your_stripe_secret_key
   STRIPE_API_VERSION=your_stripe_api_version
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

## Features ✨

- 💳 One-time payment processing
- 🔄 Subscription management
- 🛍️ Stripe Checkout integration
- 👥 Customer management
- 🎣 Webhook handling
- 📝 TypeScript support
- 🔌 Auto-configuration setup
- 🔧 Environment variables management
- 🛠️ Comprehensive utility methods
- 🔍 Type-safe interfaces
- 💪 Enhanced data handling and validation
- 📊 Detailed payment information extraction
- 🔐 Secure webhook processing

## Installation 📦

```bash
# Install the package
npm install @reyco1/nestjs-stripe

# Run the configuration script (if automatic setup didn't run)
npx @reyco1/nestjs-stripe
```

## Basic Usage 💡

### Using StripeService (Core Operations)

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly stripeService: StripeService) {}
  
  async createPayment() {
    return this.stripeService.createPaymentIntent({
      amount: 1000,
      currency: 'usd'
    });
  }
}
```

### Using StripeUtils (Enhanced Data Handling)

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly stripeUtils: StripeUtils) {}

  async getPaymentDetails(paymentIntent: Stripe.PaymentIntent) {
    const [customerDetails, paymentMethod, refundInfo] = await Promise.all([
      this.stripeUtils.getCustomerDetails(paymentIntent),
      this.stripeUtils.getPaymentMethodDetails(paymentIntent),
      this.stripeUtils.getRefundInfo(paymentIntent)
    ]);

    return {
      customer: customerDetails,
      payment: paymentMethod,
      refunds: refundInfo,
      amount: this.stripeUtils.formatAmount(paymentIntent.amount)
    };
  }
}
```

### Using Raw Stripe Client

```typescript
@Injectable()
export class PaymentService {
  constructor(
    @Inject(STRIPE_CLIENT_TOKEN) private readonly stripeClient: Stripe
  ) {}
  
  async createPayment() {
    return this.stripeClient.paymentIntents.create({
      amount: 1000,
      currency: 'usd'
    });
  }
}
```

## Configuration ⚙️

### Module Configuration

```typescript
// app.module.ts
import { StripeModule } from '@reyco1/nestjs-stripe';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StripeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get('STRIPE_API_KEY'),
        apiVersion: configService.get('STRIPE_API_VERSION'),
        webhookSecret: configService.get('STRIPE_WEBHOOK_SECRET'),
      }),
    }),
  ],
})
export class AppModule {}
```

## Checkout Sessions 🛍️

### Payment Checkout

Create one-time payment checkout sessions:

```typescript
const session = await stripeService.createPaymentCheckoutSession({
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  lineItems: [{
    price: 'price_H5ggYwtDq4fbrJ',
    quantity: 1
  }],
  // Or create a product on the fly:
  // lineItems: [{
  //   name: 'T-shirt',
  //   amount: 2000,
  //   currency: 'usd',
  //   quantity: 1
  // }],
  paymentMethodTypes: ['card'],
  shippingAddressCollection: {
    allowed_countries: ['US', 'CA']
  },
  billingAddressCollection: 'required',
  customerCreation: 'if_required'
});
```

### Subscription Checkout

Create subscription checkout sessions:

```typescript
const session = await stripeService.createSubscriptionCheckoutSession({
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  lineItems: [{
    price: 'price_H5ggYwtDq4fbrJ', // recurring price ID
    quantity: 1
  }],
  paymentMethodTypes: ['card'],
  trialPeriodDays: 14,
  subscriptionData: {
    description: 'Premium Plan Subscription',
    metadata: {
      plan: 'premium'
    }
  },
  customerCreation: 'if_required'
});
```

### Customer Creation Behavior

The customer creation behavior in checkout sessions depends on how you configure the `customerId` and `customerCreation` parameters:

1. **Using Existing Customer**
```typescript
await stripeService.createPaymentCheckoutSession({
  customerId: 'cus_123...', // Will use this customer
  customerCreation: 'always', // This will be ignored
  // ... other params
});
```

2. **New Customer for One-time Payment**
```typescript
await stripeService.createPaymentCheckoutSession({
  customerCreation: 'always', // Will create new customer
  // ... other params
});
```

3. **New Customer for Subscription**
```typescript
await stripeService.createSubscriptionCheckoutSession({
  customerCreation: 'if_required', // Will create customer since needed for subscriptions
  // ... other params
});
```

4. **Default Behavior**
- For one-time payments: Customer is only created if specifically requested
- For subscriptions: Customer is always created if not provided
- When `customerId` is provided: Existing customer is used and `customerCreation` is ignored

### Configuration Options

Common configuration options for checkout sessions:

```typescript
interface CheckoutSessionOptions {
  // Required parameters
  successUrl: string;          // Redirect after successful payment
  cancelUrl: string;           // Redirect if customer cancels
  lineItems: LineItem[];       // Products/prices to charge

  // Customer handling
  customerId?: string;         // Existing customer ID
  customerEmail?: string;      // Pre-fill customer email
  customerCreation?: 'always' | 'if_required';

  // Payment configuration
  paymentMethodTypes?: PaymentMethodType[]; // e.g., ['card', 'sepa_debit']
  allowPromotionCodes?: boolean;
  
  // Address collection
  billingAddressCollection?: 'required' | 'auto';
  shippingAddressCollection?: {
    allowed_countries: string[]; // e.g., ['US', 'CA']
  };

  // Customization
  locale?: string;             // e.g., 'auto' or 'en'
  submitType?: 'auto' | 'pay' | 'book' | 'donate';
  
  // Additional data
  metadata?: Record<string, string | number>;
  clientReferenceId?: string;
}
```

## Utility Methods 🛠️

### Customer Details

```typescript
const customerDetails = await stripeUtils.getCustomerDetails(paymentIntent);
// Returns:
{
  customerId: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}
```

### Payment Method Details

```typescript
const paymentMethod = await stripeUtils.getPaymentMethodDetails(paymentIntent);
// Returns:
{
  id?: string;
  type?: string;
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: Stripe.Address;
  };
  metadata?: Record<string, string>;
}
```

### Refund Information

```typescript
const refundInfo = await stripeUtils.getRefundInfo(paymentIntent);
// Returns:
{
  refunded: boolean;
  refundedAmount?: number;
  refundCount?: number;
  refunds?: Array<{
    id: string;
    amount: number;
    status: string;
    reason?: string;
    created: Date;
    metadata?: Record<string, string>;
  }>;
}
```

### Subscription Details

```typescript
const subscription = await stripeUtils.getSubscriptionDetails(subscriptionId);
// Returns:
{
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  endedAt?: Date;
  metadata?: Record<string, string>;
  items?: Array<{
    id: string;
    priceId: string;
    quantity?: number;
    metadata?: Record<string, string>;
  }>;
}
```

### Amount Formatting

```typescript
const formattedAmount = stripeUtils.formatAmount(1000, 'usd');
// Returns: "$10.00"
```

## Payment Operations 💳

### Creating One-Time Payments

```typescript
@Injectable()
export class PaymentService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeUtils: StripeUtils
  ) {}

  async createPayment() {
    const payment = await this.stripeService.createPaymentIntent({
      amount: 1000,
      currency: 'usd',
      metadata: {
        orderId: 'ORDER_123'
      }
    });

    // Get comprehensive payment details
    const details = await this.stripeUtils.getPaymentMethodDetails(payment);
    const customer = await this.stripeUtils.getCustomerDetails(payment);

    return {
      payment,
      details,
      customer,
      formattedAmount: this.stripeUtils.formatAmount(payment.amount)
    };
  }
}
```

## Subscription Management 📅

```typescript
@Injectable()
export class SubscriptionService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeUtils: StripeUtils
  ) {}

  async createSubscription(customerId: string, priceId: string) {
    const subscription = await this.stripeService.createSubscription({
      customerId,
      priceId,
      metadata: {
        plan: 'premium'
      }
    });

    return this.stripeUtils.getSubscriptionDetails(subscription.id);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripeService.cancelSubscription(subscriptionId);
  }
}
```

## Webhook Handling 🎣

```typescript
@Controller('stripe/webhooks')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeUtils: StripeUtils
  ) {}

  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request
  ) {
    const event = await this.stripeService.createWebhookEvent(
      request.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const [customer, paymentMethod] = await Promise.all([
          this.stripeUtils.getCustomerDetails(paymentIntent),
          this.stripeUtils.getPaymentMethodDetails(paymentIntent)
        ]);
        // Handle successful payment
        break;
      }
      
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const details = await this.stripeUtils.getSubscriptionDetails(subscription);
        // Handle new subscription
        break;
      }
    }

    return { received: true };
  }
}
```

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

MIT

---

Made with ❤️ by Reyco1