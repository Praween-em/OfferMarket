import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BunnyService {
    private readonly logger = new Logger(BunnyService.name);
    private readonly storageZoneName: string;
    private readonly accessKey: string;
    private readonly pullZoneUrl: string;
    private readonly storageHostname: string;

    constructor(private configService: ConfigService) {
        this.storageZoneName = this.configService.get<string>('BUNNY_STORAGE_ZONE_NAME')!.trim();
        this.accessKey = this.configService.get<string>('BUNNY_ACCESS_KEY')!.trim();
        this.pullZoneUrl = this.configService.get<string>('BUNNY_PULL_ZONE_URL')!.trim();
        this.storageHostname = this.configService.get<string>('BUNNY_STORAGE_HOSTNAME', 'storage.bunnycdn.com').trim();

        this.logger.log(`Initialized BunnyService for Storage Zone: ${this.storageZoneName}`);
        this.logger.log(`Using Storage Hostname: ${this.storageHostname}`);
        const maskedKey = this.accessKey.substring(0, 4) + '...' + this.accessKey.substring(this.accessKey.length - 4);
        this.logger.log(`Using AccessKey: ${maskedKey}`);
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'listings'): Promise<string> {
        const fileName = `${uuidv4()}-${file.originalname}`;
        const path = folder ? `${folder}/${fileName}` : fileName;
        const url = `https://${this.storageHostname}/${this.storageZoneName}/${path}`;

        try {
            await axios.put(url, file.buffer, {
                headers: {
                    AccessKey: this.accessKey,
                    'Content-Type': file.mimetype,
                },
            });

            return `${this.pullZoneUrl}/${path}`;
        } catch (error) {
            this.logger.error(`Bunny.net Upload Error: ${error.message}`);
            if (error.response) {
                this.logger.error(`Response Data: ${JSON.stringify(error.response.data)}`);
            }
            throw new Error('Failed to upload file to Bunny.net');
        }
    }
}
