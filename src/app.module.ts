import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { OrdersModule } from './orders/orders.module';
import { CounselingModule } from './counseling/counseling.module';
import { SermonsModule } from './sermons/sermons.module';
import { DevotionalsModule } from './devotionals/devotionals.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { EventsModule } from './events/events.module';
import { PrayerRequestsModule } from './prayer-requests/prayer-requests.module';
import { TestimoniesModule } from './testimonies/testimonies.module';
import { GroupsModule } from './groups/groups.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MediaModule } from './media/media.module';
import { PaymentsModule } from './payments/payments.module';
import { GivingModule } from './giving/giving.module';
import { AdminModule } from './admin/admin.module';

// Guards & Filters & Interceptors
import { JwtAuthGuard } from './common/guards';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per TTL
      },
    ]),

    // Database
    DatabaseModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    BooksModule,
    OrdersModule,
    CounselingModule,
    SermonsModule,
    DevotionalsModule,
    AnnouncementsModule,
    EventsModule,
    PrayerRequestsModule,
    TestimoniesModule,
    GroupsModule,
    AiAssistantModule,
    NotificationsModule,
    MediaModule,
    PaymentsModule,
    GivingModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
