import { Module } from '@nestjs/common';
import { ConnectedAccountsService } from './connected-accounts.service';
import { ConnectedAccountsController } from './controllers/connected-accounts.controller';

@Module({
    providers: [ConnectedAccountsService],
    controllers: [ConnectedAccountsController],
    exports: [ConnectedAccountsService],
})
export class ConnectedAccountsModule { }