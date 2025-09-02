import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ErrorsModule } from './modules/errors/errors.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    ErrorsModule,
    AnalyticsModule,
  ],
  providers: [DatabaseConfig],
  exports: [DatabaseConfig],
})
export class AppModule {}
