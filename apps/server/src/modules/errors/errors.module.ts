import { Module } from '@nestjs/common';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { DatabaseConfig } from '../../config/database.config';

@Module({
  controllers: [ErrorsController],
  providers: [ErrorsService, DatabaseConfig],
  exports: [ErrorsService],
})
export class ErrorsModule {}
