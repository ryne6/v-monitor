import { Module } from '@nestjs/common';
import { DatabaseConfig } from '../../config/database.config';

@Module({
  providers: [DatabaseConfig],
  exports: [],
})
export class AnalyticsModule {}
