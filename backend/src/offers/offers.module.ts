import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { OffersLeadsService } from './offers-leads.service';
import { OffersLeadsController } from './offers-leads.controller';

@Module({
  controllers: [OffersController, OffersLeadsController],
  providers: [OffersService, OffersLeadsService],
})
export class OffersModule { }
