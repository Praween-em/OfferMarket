import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { OffersModule } from './offers/offers.module';
import { UsersModule } from './users/users.module';

import { ConfigModule } from '@nestjs/config';
import { BunnyModule } from './bunny/bunny.module';
import { MediaModule } from './media/media.module';
import { Msg91Module } from './msg91/msg91.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    CategoriesModule,
    OffersModule,
    UsersModule,
    BunnyModule,
    MediaModule,
    Msg91Module,
    AiModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {
    console.log('✅ AppModule Initialized - Version: 2026-01-25-v3 (Gemini & Fixes)');
  }
}
