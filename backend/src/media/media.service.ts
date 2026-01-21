import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
    constructor(private prisma: PrismaService) { }

    async createAsset(data: {
        url: string;
        owner_id: string;
        nsfw_score: number;
        nsfw_status: string;
        media_type?: string;
        metadata?: any;
    }) {
        return this.prisma.media_assets.create({
            data: {
                url: data.url,
                owner_id: data.owner_id,
                nsfw_score: data.nsfw_score,
                nsfw_status: data.nsfw_status,
                media_type: (data.media_type as any) || 'image',
                metadata: data.metadata || {},
            },
        });
    }
}
