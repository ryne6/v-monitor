import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ErrorsModule } from './errors/errors.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ErrorsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
