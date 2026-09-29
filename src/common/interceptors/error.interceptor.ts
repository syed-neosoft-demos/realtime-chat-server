import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UniqueConstraintError, ValidationError } from 'sequelize';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (err instanceof HttpException) {
          status = err.getStatus();
          const res = err.getResponse() as any;
          // ValidationPipe returns message as string[]
          const raw = typeof res === 'string' ? res : (res?.message ?? err.message);
          message = Array.isArray(raw) ? raw.join(', ') : raw;
        } else if (err instanceof UniqueConstraintError) {
          status = HttpStatus.CONFLICT;
          message = err.errors.map((e) => e.message).join(', ');
        } else if (err instanceof ValidationError) {
          status = HttpStatus.BAD_REQUEST;
          message = err.errors.map((e) => e.message).join(', ');
        } else {
          // unknown error: log the details, don't leak them to the client
          this.logger.error(err?.message, err?.stack);
        }

        return throwError(() => new HttpException({ success: false, message, data: null }, status));
      }),
    );
  }
}
