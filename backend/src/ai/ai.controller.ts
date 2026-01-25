import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('generate-description')
    @UseGuards(JwtAuthGuard)
    async generateDescription(
        @Body() body: { itemName: string; campaignTitle: string },
    ) {
        const description = await this.aiService.generateDescription(
            body.itemName,
            body.campaignTitle,
        );
        return { description };
    }
}
