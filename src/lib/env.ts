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
  
  // 서버 설정
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL_URL: process.env.VERCEL_URL,
  PORT: process.env.PORT || '3000',
} as const;
