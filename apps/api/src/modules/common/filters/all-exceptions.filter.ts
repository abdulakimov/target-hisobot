import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Global exception filter: normalizes error responses and prevents internal 5xx details from
 * leaking to clients (they are logged with a stack instead). HttpExceptions keep their
 * intended status + message.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Ichki server xatosi';
    if (isHttp) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        message = (body as { message?: string | string[] }).message ?? exception.message;
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const detail =
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception);
      this.logger.error(`${req.method} ${req.originalUrl} -> ${status}: ${detail}`);
    } else {
      const flat = Array.isArray(message) ? message.join('; ') : message;
      this.logger.warn(`${req.method} ${req.originalUrl} -> ${status}: ${flat}`);
    }

    res.status(status).json({
      statusCode: status,
      error: isHttp ? exception.name : 'InternalServerError',
      // Never expose internal error details on 5xx.
      message: status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'Ichki server xatosi' : message,
    });
  }
}
