import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async getNotifications(@Request() req: any) {
        return this.notificationsService.getUserNotifications(req.user.id);
    }

    @Post(':id/read')
    async markRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @Delete('clear')
    async clearNotifications(@Request() req: any) {
        return this.notificationsService.clearAll(req.user.id);
    }
}
