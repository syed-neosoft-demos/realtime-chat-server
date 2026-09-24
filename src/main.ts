import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from '@/app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET
      ? { instrument: ObserveInstrument }
      : {},
  );
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
