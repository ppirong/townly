/**
 * 통합 에러 핸들링 시스템
 * 
 * 애플리케이션 전반에서 사용할 표준화된 에러 클래스와 핸들링 로직을 제공합니다.
 */

import { getConfig } from '@/lib/config';

/**
 * 에러 코드 정의
 */
export enum ErrorCode {
  // 일반적인 에러
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  
  // 데이터베이스 에러
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',
  
  // 외부 API 에러
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  EXTERNAL_API_TIMEOUT = 'EXTERNAL_API_TIMEOUT',
  EXTERNAL_API_RATE_LIMIT = 'EXTERNAL_API_RATE_LIMIT',
  EXTERNAL_API_QUOTA_EXCEEDED = 'EXTERNAL_API_QUOTA_EXCEEDED',
  
  // 대기질 서비스 에러
  AIR_QUALITY_DATA_NOT_FOUND = 'AIR_QUALITY_DATA_NOT_FOUND',
  AIR_QUALITY_INVALID_LOCATION = 'AIR_QUALITY_INVALID_LOCATION',
  AIR_QUALITY_SERVICE_UNAVAILABLE = 'AIR_QUALITY_SERVICE_UNAVAILABLE',
  
  // 캐시 에러
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_MISS = 'CACHE_MISS',
  
  // 설정 에러
  CONFIG_ERROR = 'CONFIG_ERROR',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',
}

/**
 * 에러 심각도 레벨
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 기본 애플리케이션 에러 클래스
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  public readonly userMessage?: string;

  constructor(
    code: ErrorCode,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    context?: Record<string, any>,
    userMessage?: string
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
    this.userMessage = userMessage;
    
    // V8 엔진에서 스택 트레이스 캡처
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 에러를 JSON으로 직렬화
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      userMessage: this.userMessage,
      stack: this.stack,
    };
  }

  /**
   * 사용자 친화적 메시지 반환
   */
  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  /**
   * 기본 사용자 메시지 생성
   */
  private getDefaultUserMessage(): string {
    switch (this.code) {
      case ErrorCode.AUTHENTICATION_ERROR:
        return '로그인이 필요합니다.';
      case ErrorCode.AUTHORIZATION_ERROR:
        return '접근 권한이 없습니다.';
      case ErrorCode.NOT_FOUND_ERROR:
        return '요청한 정보를 찾을 수 없습니다.';
      case ErrorCode.VALIDATION_ERROR:
        return '입력된 정보가 올바르지 않습니다.';
      case ErrorCode.EXTERNAL_API_TIMEOUT:
        return '서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      case ErrorCode.EXTERNAL_API_RATE_LIMIT:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case ErrorCode.AIR_QUALITY_DATA_NOT_FOUND:
        return '해당 지역의 대기질 정보를 찾을 수 없습니다.';
      case ErrorCode.AIR_QUALITY_INVALID_LOCATION:
        return '올바르지 않은 위치 정보입니다.';
      case ErrorCode.DATABASE_CONNECTION_ERROR:
        return '데이터베이스 연결에 문제가 발생했습니다.';
      default:
        return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
  }
}

/**
 * 데이터베이스 에러
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DATABASE_QUERY_ERROR,
    context?: Record<string, any>
  ) {
    super(
      code,
      message,
      ErrorSeverity.HIGH,
      true,
      context,
      '데이터베이스 처리 중 오류가 발생했습니다.'
    );
  }
}

/**
 * 외부 API 에러
 */
export class ExternalApiError extends AppError {
  public readonly apiProvider: string;
  public readonly statusCode?: number;
  public readonly responseBody?: any;

  constructor(
    apiProvider: string,
    message: string,
    code: ErrorCode = ErrorCode.EXTERNAL_API_ERROR,
    statusCode?: number,
    responseBody?: any,
    context?: Record<string, any>
  ) {
    super(
      code,
      message,
      ErrorSeverity.MEDIUM,
      true,
      { ...context, apiProvider, statusCode, responseBody }
    );
    
    this.apiProvider = apiProvider;
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * 대기질 서비스 에러
 */
export class AirQualityError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.AIR_QUALITY_SERVICE_UNAVAILABLE,
    context?: Record<string, any>
  ) {
    super(
      code,
      message,
      ErrorSeverity.MEDIUM,
      true,
      context
    );
  }
}

/**
 * 유효성 검사 에러
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string,
    field?: string,
    value?: any,
    context?: Record<string, any>
  ) {
    super(
      ErrorCode.VALIDATION_ERROR,
      message,
      ErrorSeverity.LOW,
      true,
      { ...context, field, value },
      '입력된 정보를 확인해주세요.'
    );
    
    this.field = field;
    this.value = value;
  }
}

/**
 * 에러 로깅 함수
 */
export function logError(error: Error | AppError, additionalContext?: Record<string, any>): void {
  const config = getConfig();
  
  // 로그 레벨에 따른 필터링
  if (error instanceof AppError) {
    const shouldLog = 
      config.logging.level === 'debug' ||
      (config.logging.level === 'info' && error.severity !== ErrorSeverity.LOW) ||
      (config.logging.level === 'warn' && [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(error.severity)) ||
      (config.logging.level === 'error' && error.severity === ErrorSeverity.CRITICAL);
    
    if (!shouldLog) return;
  }

  const logData = {
    timestamp: new Date().toISOString(),
    error: error instanceof AppError ? error.toJSON() : {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    additionalContext,
  };

  // 콘솔 로깅 (개발 환경에서만)
  if (config.logging.enableConsole) {
    if (error instanceof AppError && error.severity === ErrorSeverity.CRITICAL) {
      console.error('🚨 CRITICAL ERROR:', logData);
    } else if (error instanceof AppError && error.severity === ErrorSeverity.HIGH) {
      console.error('❌ HIGH SEVERITY ERROR:', logData);
    } else {
      console.error('⚠️ ERROR:', logData);
    }
  }

  // 파일 로깅 (프로덕션 환경)
  if (config.logging.enableFile) {
    // 실제 구현에서는 Winston, Pino 등의 로깅 라이브러리 사용
    // 여기서는 기본 구조만 제공
    // logger.error(logData);
  }
}

/**
 * 에러 핸들러 함수
 */
export function handleError(error: unknown, context?: Record<string, any>): AppError {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    // 일반 Error를 AppError로 변환
    appError = new AppError(
      ErrorCode.UNKNOWN_ERROR,
      error.message,
      ErrorSeverity.MEDIUM,
      false,
      context
    );
  } else {
    // 알 수 없는 에러 타입
    appError = new AppError(
      ErrorCode.UNKNOWN_ERROR,
      '알 수 없는 오류가 발생했습니다.',
      ErrorSeverity.MEDIUM,
      false,
      { originalError: error, ...context }
    );
  }

  // 에러 로깅
  logError(appError, context);

  return appError;
}

/**
 * 비동기 함수 래퍼 (에러 핸들링 자동화)
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, any>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, context);
    }
  };
}

/**
 * 재시도 로직이 포함된 함수 실행
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2,
  context?: Record<string, any>
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 마지막 시도인 경우 에러 던지기
      if (attempt === maxRetries) {
        throw handleError(lastError, { ...context, attempts: attempt });
      }
      
      // 재시도 불가능한 에러인 경우 즉시 던지기
      if (error instanceof AppError && !error.isOperational) {
        throw error;
      }
      
      // 지수 백오프로 대기
      const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw handleError(lastError!, context);
}

/**
 * 타임아웃이 포함된 함수 실행
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context?: Record<string, any>
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ExternalApiError(
        'timeout',
        `작업이 ${timeoutMs}ms 내에 완료되지 않았습니다.`,
        ErrorCode.EXTERNAL_API_TIMEOUT,
        undefined,
        undefined,
        context
      ));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } catch (error) {
    throw handleError(error, context);
  }
}
