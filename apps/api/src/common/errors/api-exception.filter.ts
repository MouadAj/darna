import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus} from '@nestjs/common';
import type {Response} from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const message = typeof raw === 'string' ? raw : raw && typeof raw === 'object' && 'message' in raw ? raw.message : 'Something went wrong';

    if (!(exception instanceof HttpException)) console.error(exception);
    response.status(status).json({statusCode: status, message, timestamp: new Date().toISOString()});
  }
}
