import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`🚀 Order Service corriendo en: http://localhost:${port}`);
}
bootstrap();