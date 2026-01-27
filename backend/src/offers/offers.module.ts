import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { OffersLeadsService } from './offers-leads.service';
import { OffersLeadsController } from './offers-leads.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [OffersController, OffersLeadsController],
  providers: [OffersService, OffersLeadsService],
})
export class OffersModule { }
