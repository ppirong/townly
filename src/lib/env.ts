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
  KAKAO_API_KEY: process.env.KAKAO_API_KEY,
  
  // 서버 설정
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL_URL: process.env.VERCEL_URL,
  PORT: process.env.PORT || '3000',
} as const;
