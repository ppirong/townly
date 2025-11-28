/**
 * 환경별 설정 관리 시스템
 * 
 * 개발, 스테이징, 프로덕션 환경에 따른 설정을 중앙에서 관리합니다.
 */

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  // 로깅 설정
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableFile: boolean;
  };
  
  // 대기질 API 설정
  airQuality: {
    cacheTimeout: number; // 초 단위
    maxRetries: number;
    retryDelay: number; // 밀리초
    batchSize: number;
    enableDebugLogs: boolean;
  };
  
  // 데이터베이스 설정
  database: {
    connectionTimeout: number; // 밀리초
    queryTimeout: number; // 밀리초
    maxConnections: number;
    enableQueryLogging: boolean;
  };
  
  // 외부 API 설정
  externalApis: {
    google: {
      timeout: number; // 밀리초
      rateLimit: {
        requestsPerMinute: number;
        requestsPerDay: number;
      };
    };
    accuWeather: {
      timeout: number;
      rateLimit: {
        requestsPerMinute: number;
        requestsPerDay: number;
      };
    };
  };
  
  // 캐싱 설정
  cache: {
    defaultTtl: number; // 초 단위
    maxSize: number; // 메모리 캐시 최대 크기 (MB)
    enableRedis: boolean;
  };
  
  // 보안 설정
  security: {
    enableRateLimit: boolean;
    maxRequestsPerMinute: number;
    enableCors: boolean;
    allowedOrigins: string[];
  };
}

/**
 * 환경별 설정 정의
 */
const configs: Record<Environment, AppConfig> = {
  development: {
    logging: {
      level: 'debug',
      enableConsole: true,
      enableFile: false,
    },
    airQuality: {
      cacheTimeout: 300, // 5분
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 10,
      enableDebugLogs: false, // 개발 환경에서도 콘솔 로그 비활성화
    },
    database: {
      connectionTimeout: 10000,
      queryTimeout: 30000,
      maxConnections: 10,
      enableQueryLogging: false,
    },
    externalApis: {
      google: {
        timeout: 30000,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerDay: 10000,
        },
      },
      accuWeather: {
        timeout: 15000,
        rateLimit: {
          requestsPerMinute: 50,
          requestsPerDay: 5000,
        },
      },
    },
    cache: {
      defaultTtl: 300,
      maxSize: 100,
      enableRedis: false,
    },
    security: {
      enableRateLimit: false,
      maxRequestsPerMinute: 1000,
      enableCors: true,
      allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    },
  },
  
  staging: {
    logging: {
      level: 'info',
      enableConsole: true,
      enableFile: true,
    },
    airQuality: {
      cacheTimeout: 600, // 10분
      maxRetries: 5,
      retryDelay: 2000,
      batchSize: 20,
      enableDebugLogs: false,
    },
    database: {
      connectionTimeout: 15000,
      queryTimeout: 45000,
      maxConnections: 20,
      enableQueryLogging: false,
    },
    externalApis: {
      google: {
        timeout: 45000,
        rateLimit: {
          requestsPerMinute: 80,
          requestsPerDay: 8000,
        },
      },
      accuWeather: {
        timeout: 20000,
        rateLimit: {
          requestsPerMinute: 40,
          requestsPerDay: 4000,
        },
      },
    },
    cache: {
      defaultTtl: 600,
      maxSize: 200,
      enableRedis: true,
    },
    security: {
      enableRateLimit: true,
      maxRequestsPerMinute: 500,
      enableCors: true,
      allowedOrigins: ['https://staging.townly.app'],
    },
  },
  
  production: {
    logging: {
      level: 'error',
      enableConsole: false,
      enableFile: true,
    },
    airQuality: {
      cacheTimeout: 3600, // 1시간
      maxRetries: 5,
      retryDelay: 3000,
      batchSize: 50,
      enableDebugLogs: false,
    },
    database: {
      connectionTimeout: 20000,
      queryTimeout: 60000,
      maxConnections: 50,
      enableQueryLogging: false,
    },
    externalApis: {
      google: {
        timeout: 60000,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerDay: 6000,
        },
      },
      accuWeather: {
        timeout: 30000,
        rateLimit: {
          requestsPerMinute: 30,
          requestsPerDay: 3000,
        },
      },
    },
    cache: {
      defaultTtl: 3600,
      maxSize: 500,
      enableRedis: true,
    },
    security: {
      enableRateLimit: true,
      maxRequestsPerMinute: 200,
      enableCors: true,
      allowedOrigins: ['https://townly.app', 'https://www.townly.app'],
    },
  },
};

/**
 * 현재 환경 감지
 */
export function getCurrentEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV;
  const vercelEnv = process.env.VERCEL_ENV;
  
  // Vercel 환경 우선 확인
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'staging';
  
  // NODE_ENV 기반 확인
  if (nodeEnv === 'production') return 'production';
  
  return 'development';
}

/**
 * 현재 환경의 설정 가져오기
 */
export function getConfig(): AppConfig {
  const env = getCurrentEnvironment();
  return configs[env];
}

/**
 * 특정 환경의 설정 가져오기
 */
export function getConfigForEnvironment(env: Environment): AppConfig {
  return configs[env];
}

/**
 * 환경 변수 검증
 */
export function validateEnvironmentVariables(): void {
  const requiredVars = [
    'DATABASE_URL',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`필수 환경 변수가 설정되지 않았습니다: ${missing.join(', ')}`);
  }
}

/**
 * 설정 정보 로깅 (민감한 정보 제외)
 */
export function logConfigInfo(): void {
  const env = getCurrentEnvironment();
  const config = getConfig();
  
  console.log(`🌍 Environment: ${env}`);
  console.log(`📊 Cache timeout: ${config.airQuality.cacheTimeout}s`);
  console.log(`🔒 Rate limiting: ${config.security.enableRateLimit ? 'enabled' : 'disabled'}`);
  console.log(`📝 Log level: ${config.logging.level}`);
}

// 애플리케이션 시작 시 환경 변수 검증
if (typeof window === 'undefined') {
  try {
    validateEnvironmentVariables();
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}
