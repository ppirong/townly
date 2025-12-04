#!/usr/bin/env node

/**
 * 프로덕션 빌드 전 필수 환경변수 체크 스크립트
 */

const requiredEnvVars = [
  // Clerk 관련
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_WEBHOOK_SECRET',
  
  // 데이터베이스
  'DATABASE_URL',
  
  // API Keys
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  
  // 카카오 관련
  'KAKAO_REST_API_KEY',
  'KAKAO_ADMIN_KEY',
  
  // Gmail 관련
  'NEXT_PUBLIC_GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  
  // 기타
  'CRON_SECRET',
  'NEXTAUTH_SECRET'
];

const optionalEnvVars = [
  'CLAUDE_API_KEY',
  'KAKAO_JAVASCRIPT_KEY',
  'GMAIL_REFRESH_TOKEN'
];

console.log('🔍 환경변수 체크 시작...\n');

let hasErrors = false;
const missingRequired = [];
const missingOptional = [];

// 필수 환경변수 체크
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingRequired.push(varName);
    hasErrors = true;
  }
});

// 선택적 환경변수 체크
optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingOptional.push(varName);
  }
});

// 결과 출력
if (missingRequired.length > 0) {
  console.log('❌ 누락된 필수 환경변수:');
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
}

if (missingOptional.length > 0) {
  console.log('⚠️  누락된 선택적 환경변수:');
  missingOptional.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
}

// 환경 정보 출력
console.log('📊 환경 정보:');
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   - Platform: ${process.platform}`);
console.log(`   - Node Version: ${process.version}`);
console.log('');

if (hasErrors) {
  console.log('💡 해결 방법:');
  console.log('   1. .env.local 파일에 누락된 환경변수 추가');
  console.log('   2. 프로덕션 환경에서 환경변수 설정 확인');
  console.log('   3. Vercel/Netlify 등에서 환경변수 설정');
  console.log('');
  process.exit(1);
} else {
  console.log('✅ 모든 필수 환경변수가 설정되었습니다!');
  process.exit(0);
}
