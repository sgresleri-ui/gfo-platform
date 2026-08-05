import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createGfoCorsOptions, getGfoServerHost } from './network-policy';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(createGfoCorsOptions());

  await app.listen(3000, getGfoServerHost());
}

void bootstrap();
