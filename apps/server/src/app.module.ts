import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ErrorsModule } from './errors/errors.module';
import { HealthController } from './health.controller';
import { SourcemapsModule } from './sourcemaps/sourcemaps.module';

@Module({
  imports: [ErrorsModule, SourcemapsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
