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

  @UseGuards(JwtAuthGuard)
  @Post('campaigns')
  createCampaign(@Request() req: any, @Body() createCampaignDto: any) {
    return this.offersService.createCampaign(req.user.userId, createCampaignDto);
  }
  @Get('business/:businessId')
  getOffersByBusiness(@Param('businessId') businessId: string) {
    return this.offersService.getOffersByBusiness(businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOfferDto: any) {
    return this.offersService.update(id, updateOfferDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.offersService.toggleStatus(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner/dashboard-stats')
  getDashboardStats(@Request() req: any) {
    return this.offersService.getDashboardStats(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner/analytics')
  getAnalytics(@Request() req: any) {
    return this.offersService.getAnalytics(req.user.userId);
  }
}
