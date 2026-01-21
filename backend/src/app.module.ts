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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
