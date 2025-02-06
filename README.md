# @reyco1/nestjs-stripe

A NestJS module for Stripe integration that provides easy-to-use functionality for one-time payments and subscriptions.

## Installation

```bash
npx install @reyco1/nestjs-stripe
```

## Usage

1. Import the StripeModule in your app.module.ts:

```typescript
import { StripeModule } from '@reyco1/nestjs-stripe';

@Module({
  imports: [
    StripeModule.forRoot({
      apiKey: 'your_stripe_secret_key',
      webhookSecret: 'your_webhook_secret', // optional
      apiVersion: '2023-10-16', // optional, defaults to '2023-10-16'
    }),
  ],
})
export class AppModule {}
```

2. Inject and use the StripeService in your controllers/services:

```typescript
import { StripeService } from '@reyco1/nestjs-stripe';

@Injectable()
export class PaymentService {
  constructor(private readonly stripeService: StripeService) {}

  async createPayment() {
    const payment = await this.stripeService.createPaymentIntent({
      amount: 1000, // amount in cents
      currency: 'usd',
    });
    return payment;
  }

  async createSubscription(customerId: string, priceId: string) {
    const subscription = await this.stripeService.createSubscription({
      customerId,
      priceId,
    });
    return subscription;
  }
}
```

## Features

- One-time payments
- Subscriptions
- Customer management
- Webhook handling
- TypeScript support
- Full NestJS integration

## API Documentation

### StripeService Methods

- `createPaymentIntent(data: CreatePaymentDto)`: Create a one-time payment
- `createSubscription(data: CreateSubscriptionDto)`: Create a subscription
- `createCustomer(email: string, name?: string)`: Create a Stripe customer
- `cancelSubscription(subscriptionId: string)`: Cancel a subscription
- `retrieveSubscription(subscriptionId: string)`: Get subscription details
- `createWebhookEvent(payload: Buffer, signature: string, webhookSecret: string)`: Handle webhook events

## Webhook Handling Example

Here's how to handle webhooks and access metadata:

```typescript
import { Controller, Post, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { StripeService } from '@reyco1/nestjs-stripe';
import Stripe from 'stripe';

@Controller('stripe/webhooks')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly userService: UserService, // Your user service
  ) {}

  @Post()
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = await this.stripeService.createWebhookEvent(
      request.rawBody,
      signature,
      'your_webhook_secret'
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const userId = paymentIntent.metadata.userId;
        
        // Update user's payment status
        await this.userService.updatePaymentStatus(userId, 'paid');
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        
        // Update user's subscription status
        await this.userService.updateSubscription(userId, {
          subscriptionId: subscription.id,
          status: subscription.status,
        });
        break;
      }
    }

    return { received: true };
  }
}
```

Example usage with metadata:

```typescript
// One-time payment with metadata
const payment = await stripeService.createPaymentIntent({
  amount: 1000,
  currency: 'usd',
  metadata: {
    userId: '123',
    orderNumber: 'ORD-456',
  },
  description: 'Payment for Order #456',
});

// Subscription with metadata
const subscription = await stripeService.createSubscription({
  customerId: 'cus_123',
  priceId: 'price_456',
  metadata: {
    userId: '123',
    plan: 'premium',
  },
  description: 'Premium Plan Subscription',
});
```

## License

MIT