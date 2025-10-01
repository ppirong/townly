/**
 * 환경변수 타입 안전성을 위한 설정
 */

export const env = {
  // Clerk 인증
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  
  // 데이터베이스
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // AI/API 키들
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, // 선택적 (Claude 사용 시 필요)
  
  // 카카오 API 설정
  KAKAO_API_KEY: process.env.KAKAO_API_KEY,
  KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY,
  KAKAO_ADMIN_KEY: process.env.KAKAO_ADMIN_KEY,
  KAKAO_CHANNEL_ID: process.env.KAKAO_CHANNEL_ID,
  KAKAO_SENDER_KEY: process.env.KAKAO_SENDER_KEY,
  KAKAO_TEMPLATE_ID: process.env.KAKAO_TEMPLATE_ID,
  
  // MCP Weather Server (AccuWeather API)
  ACCUWEATHER_API_KEY: process.env.ACCUWEATHER_API_KEY,
  
  // 한국환경공단 에어코리아 API
  AIRKOREA_API_KEY: process.env.AIRKOREA_API_KEY,
  
  // Google Air Quality API
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  
  // Gmail API 설정
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID!,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET!,
  GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI!,
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
  GMAIL_ACCESS_TOKEN: process.env.GMAIL_ACCESS_TOKEN,
  GMAIL_FROM_EMAIL: process.env.GMAIL_FROM_EMAIL!,
  
  // 클라이언트 사이드용 환경변수
  NEXT_PUBLIC_GMAIL_CLIENT_ID: process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID!,
  
  // 크론 작업 보안
  CRON_SECRET: process.env.CRON_SECRET || 'cron-secret-key',
  
  // 서버 설정
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL_URL: process.env.VERCEL_URL,
  PORT: process.env.PORT || '3000',
} as const;
