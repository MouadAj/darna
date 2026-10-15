import {ValidationPipe} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {NestFactory} from '@nestjs/core';
import {ExpressAdapter} from '@nestjs/platform-express';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {AppModule} from './app.module';
import {ApiExceptionFilter} from './common/errors/api-exception.filter';

async function bootstrap() {
  // Passing the adapter explicitly avoids Nest's runtime package loader, which
  // cannot synchronously discover an ESM-only HTTP adapter from CommonJS output.
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), {cors: false});
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet({contentSecurityPolicy: false}));
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN').split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true}));
  app.useGlobalFilters(new ApiExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HouseFamily API')
    .setDescription('Private, household-scoped API for HouseFamily')
    .setVersion('0.1.0')
    .addCookieAuth(config.get<string>('SESSION_COOKIE_NAME', 'housefamily_session'))
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get<number>('API_PORT', 4000);
  await app.listen(port, '0.0.0.0');
  console.info(`HouseFamily API running at http://localhost:${port}/api`);
}

void bootstrap();
