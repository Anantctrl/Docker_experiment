import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, body } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - now;
          this.loggingService.log(
            `${method} ${url} ${statusCode} ${duration}ms - ${ip}`,
            'LoggingInterceptor',
          );
        },
        error: (err: any) => {
          const duration = Date.now() - now;
          this.loggingService.error(
            `${method} ${url} ${err?.status ?? 500} ${duration}ms - ${ip}`,
            err?.stack,
            'LoggingInterceptor',
          );
        },
      }),
    );
  }
}
