type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext | Error) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...(context instanceof Error
        ? { error: { message: context.message, stack: context.stack } }
        : context),
    };
    
    if (level === 'error') {
      console.error(JSON.stringify(logData));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logData));
    } else {
      console.log(JSON.stringify(logData));
    }
    
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
    }
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error | LogContext) {
    this.log('error', message, error);
  }
  
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();