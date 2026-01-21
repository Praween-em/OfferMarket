import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) { }

  @Get('feed')
  getFeed(@Query('cursor') cursor?: string) {
    return this.offersService.getFeed(cursor);
  }

  @Get('hot-deals')
  getHotDeals() {
    return this.offersService.getHotDeals();
  }

  @Get('types')
  getOfferTypes() {
    return this.offersService.getOfferTypes();
  }

  @Post()
  create(@Body() createOfferDto: CreateOfferDto) {
    return this.offersService.create(createOfferDto);
  }
  @Get('business/:businessId')
  getOffersByBusiness(@Param('businessId') businessId: string) {
    return this.offersService.getOffersByBusiness(businessId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  reportOffer(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason: string,
    @Body('notes') notes?: string,
  ) {
    return this.offersService.reportOffer(id, req.user.userId, reason, notes);
  }
}
