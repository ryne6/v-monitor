import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new BigIntInterceptor());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Server started on http://localhost:${port}`);
  console.log(`API prefix: /api/v1`);
}
bootstrap();
