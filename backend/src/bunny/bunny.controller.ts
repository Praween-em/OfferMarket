import { Controller, Post, UseInterceptors, UploadedFile, Query, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BunnyService } from './bunny.service';

@Controller('bunny')
export class BunnyController {
    constructor(private readonly bunnyService: BunnyService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Query('folder') folder: string = 'listings'
    ) {
        const url = await this.bunnyService.uploadFile(file, folder);
        return { url };
    }
}
