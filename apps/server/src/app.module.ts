import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ErrorsModule } from './modules/errors/errors.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Redis 缓存配置
    CacheModule.registerAsync({
      useClass: RedisConfig,
      isGlobal: true,
    }),
    
    // 定时任务模块
    ScheduleModule.forRoot(),
    
    // 业务模块
    ErrorsModule,
    AnalyticsModule,
  ],
  providers: [DatabaseConfig],
  exports: [DatabaseConfig],
})
export class AppModule {}
