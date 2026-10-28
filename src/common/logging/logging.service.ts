import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, errors, json, printf } = format;

@Injectable()
export class LoggingService implements LoggerService {
  private readonly logger = createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json()),
    transports: [
      new transports.Console({
        format: combine(
          timestamp({ format: 'HH:mm:ss' }),
          printf(({ level, message, context, stack }) => {
            const ctx = context ? ` [${context}]` : '';
            return `${timestamp()} ${level}:${ctx} ${message}${stack ? `\n${stack}` : ''}`;
          })
        ),
      }),
      new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        dirname: 'logs',
      }),
    ],
  });

  log(message: any, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string): void {
    this.logger.error(message, { context, stack: trace });
  }

  warn(message: any, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string): void {
    this.logger.verbose(message, { context });
  }
}
