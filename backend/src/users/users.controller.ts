import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: any) {
        return this.usersService.getProfile(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('follow/:businessId')
    followBusiness(@Param('businessId') businessId: string, @Request() req: any) {
        return this.usersService.followBusiness(req.user.userId, businessId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('follow/:businessId')
    unfollowBusiness(@Param('businessId') businessId: string, @Request() req: any) {
        return this.usersService.unfollowBusiness(req.user.userId, businessId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('business/:id/report')
    reportBusiness(
        @Param('id') id: string,
        @Request() req: any,
        @Body('reason') reason: string,
        @Body('notes') notes?: string,
    ) {
        return this.usersService.reportBusiness(id, req.user.userId, reason, notes);
    }
}
