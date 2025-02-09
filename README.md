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
    - [1. Using StripeService (Core Operations)](#1-using-stripeservice-core-operations)
    - [2. Using StripeUtils (Enhanced Data Handling)](#2-using-stripeutils-enhanced-data-handling)
    - [3. Using Raw Stripe Client](#3-using-raw-stripe-client)
  - [Configuration ⚙️](#configuration-️)
    - [Module Configuration](#module-configuration)
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
  - [Key Features of StripeUtils 🌟](#key-features-of-stripeutils-)
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

You can access Stripe functionality in three ways:

### 1. Using StripeService (Core Operations)

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

### 2. Using StripeUtils (Enhanced Data Handling)

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

### 3. Using Raw Stripe Client

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
import { StripeService, StripeUtils } from '@reyco1/nestjs-stripe';

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
        userId: '123',
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
        userId: '123',
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
      // Handle other webhook events...
    }

    return { received: true };
  }
}
```

## Key Features of StripeUtils 🌟

1. **Fresh Data**: Always attempts to fetch the most recent data from Stripe
2. **Type Safety**: Full TypeScript support with proper interfaces
3. **Error Handling**: Comprehensive error handling and logging
4. **Edge Cases**: Proper handling of deleted customers and other edge cases
5. **Date Handling**: Automatic conversion of UNIX timestamps to Date objects
6. **Metadata Support**: Preserves and returns metadata across all objects
7. **Standardized Statuses**: Consistent status strings across different Stripe objects

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

MIT

---

Made with ❤️ by Reyco1