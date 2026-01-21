import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) { }

    @Post('register')
    async registerAsset(@Body() data: {
        url: string;
        owner_id: string;
        nsfw_score: number;
        nsfw_status: string;
        media_type?: string;
        metadata?: any;
    }) {
        return this.mediaService.createAsset(data);
    }
}
