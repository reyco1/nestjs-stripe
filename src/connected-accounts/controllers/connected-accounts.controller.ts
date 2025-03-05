import { Controller, Post, Body, Get, Param, Patch, Query } from "@nestjs/common";
import { ConnectedAccountsService } from "../connected-accounts.service";
import { CreateAccountLinkDto } from "../dto/create-account-link.dto";
import { CreateBankAccountDto } from "../dto/create-bank-account.dto";
import { CreateConnectedAccountDto } from "../dto/create-connected-account.dto";
import { ConnectedAccountCheckoutSessionDto } from "../dto/connected-account-checkout.dto";

@Controller('stripe/connected-accounts')
export class ConnectedAccountsController {
    constructor(private readonly connectedAccountsService: ConnectedAccountsService) { }

    @Post()
    async createConnectedAccount(@Body() createAccountDto: CreateConnectedAccountDto) {
        return this.connectedAccountsService.createConnectedAccount(createAccountDto);
    }

    @Post('link')
    async createAccountLink(@Body() createLinkDto: CreateAccountLinkDto) {
        return this.connectedAccountsService.createAccountLink(createLinkDto);
    }

    @Get(':id')
    async getConnectedAccount(@Param('id') id: string) {
        return this.connectedAccountsService.retrieveConnectedAccount(id);
    }

    @Post(':id/bank-accounts')
    async addBankAccount(
        @Param('id') accountId: string,
        @Body() bankAccountDto: CreateBankAccountDto
    ) {
        return this.connectedAccountsService.createBankAccount(accountId, bankAccountDto);
    }

    @Post(':id/payments')
    async createPayment(
        @Param('id') accountId: string,
        @Body() paymentDto: { amount: number; currency: string; applicationFeeAmount?: number }
    ) {
        return this.connectedAccountsService.createPaymentIntent(
            paymentDto.amount,
            paymentDto.currency,
            accountId,
            paymentDto.applicationFeeAmount
        );
    }

    @Post('transfers')
    async createTransfer(@Body() transferDto: {
        amount: number;
        currency: string;
        destination: string;
        metadata?: Record<string, string>
    }) {
        return this.connectedAccountsService.createTransfer(
            transferDto.amount,
            transferDto.currency,
            transferDto.destination,
            transferDto.metadata
        );
    }

    @Get()
    async listConnectedAccounts(
        @Query('limit') limit?: number,
        @Query('starting_after') startingAfter?: string
    ) {
        return this.connectedAccountsService.listConnectedAccounts(limit, startingAfter);
    }

    @Patch(':id')
    async updateConnectedAccount(
        @Param('id') accountId: string,
        @Body() updateData: Partial<CreateConnectedAccountDto>
    ) {
        return this.connectedAccountsService.updateConnectedAccount(accountId, updateData);
    }

    @Post(':id/payouts')
    async createPayout(
        @Param('id') accountId: string,
        @Body() payoutData: { amount: number; currency: string; metadata?: Record<string, string> }
    ) {
        return this.connectedAccountsService.createPayout(
            accountId,
            payoutData.amount,
            payoutData.currency,
            payoutData.metadata
        );
    }

    @Post('checkout-session')
    async createConnectedAccountCheckout(@Body() checkoutDto: ConnectedAccountCheckoutSessionDto) {
        return this.connectedAccountsService.createConnectedAccountCheckoutSession(checkoutDto);
    }
}