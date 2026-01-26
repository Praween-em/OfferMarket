import { Controller, Post, Get, Patch, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { OffersLeadsService } from './offers-leads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('offers')
export class OffersLeadsController {
    constructor(private readonly leadsService: OffersLeadsService) { }

    @Post(':id/leads')
    @UseGuards(JwtAuthGuard)
    async createLead(
        @Param('id') offerId: string,
        @Request() req: any,
        @Body() body: { user_phone: string; user_name?: string },
    ) {
        const userId = req.user?.userId || null;
        return this.leadsService.createLead(offerId, userId, body);
    }

    @Get('leads/business/:businessId')
    @UseGuards(JwtAuthGuard)
    async getBusinessLeads(
        @Param('businessId') businessId: string,
        @Query('status') status?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.leadsService.getBusinessLeads(
            businessId,
            status,
            limit ? parseInt(limit) : 20,
            offset ? parseInt(offset) : 0,
        );
    }

    @Patch('leads/:id/status')
    @UseGuards(JwtAuthGuard)
    async updateLeadStatus(
        @Param('id') leadId: string,
        @Body() body: { status: 'new' | 'contacted' | 'converted' },
    ) {
        return this.leadsService.updateLeadStatus(leadId, body.status);
    }

    @Get('leads/recent/:businessId')
    @UseGuards(JwtAuthGuard)
    async getRecentInteractions(
        @Param('businessId') businessId: string,
        @Query('limit') limit?: string,
    ) {
        return this.leadsService.getRecentInteractions(
            businessId,
            limit ? parseInt(limit) : 10,
        );
    }
}
