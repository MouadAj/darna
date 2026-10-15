import {ValidationPipe} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {NestFactory} from '@nestjs/core';
import {ExpressAdapter} from '@nestjs/platform-express';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import {default as helmet} from 'helmet';
import {AppModule} from './app.module.js';
import {ApiExceptionFilter} from './common/errors/api-exception.filter.js';
import {resolveApiPort} from './common/runtime-config.js';

async function bootstrap() {
  // Select the Express adapter explicitly for consistent local and hosted startup.
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

  const port = resolveApiPort({PORT: config.get<string>('PORT'), API_PORT: config.get<string>('API_PORT')});
  await app.listen(port, '0.0.0.0');
  console.info(`HouseFamily API running at http://localhost:${port}/api`);
}

void bootstrap();
