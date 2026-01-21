import { Module } from '@nestjs/common';
import { BunnyService } from './bunny.service';
import { BunnyController } from './bunny.controller';

@Module({
    providers: [BunnyService],
    controllers: [BunnyController],
    exports: [BunnyService],
})
export class BunnyModule { }
