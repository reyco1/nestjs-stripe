import { PaymentCheckoutSessionDto } from "../../dto/checkout-session.dto";

export class ConnectedAccountCheckoutSessionDto extends PaymentCheckoutSessionDto {
    connectedAccountId: string;
    applicationFeeAmount?: number;
}