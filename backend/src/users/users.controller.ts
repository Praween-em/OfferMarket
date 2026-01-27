import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
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
    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    updateProfile(@Request() req: any, @Body() data: any) {
        return this.usersService.updateProfile(req.user.userId, data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('branch-location')
    updateBranchLocation(@Request() req: any, @Body() data: any) {
        return this.usersService.updateBranchLocation(req.user.userId, data);
    }

    @Get('businesses')
    getBusinesses() {
        return this.usersService.findAllBusinesses();
    }
}
