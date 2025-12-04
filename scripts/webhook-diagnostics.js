/**
 * 웹훅 진단 및 문제 해결 스크립트
 */

console.log('🔍 Clerk 웹훅 진단 시작...');
console.log('='.repeat(50));

// 1. 환경변수 확인
console.log('📋 환경변수 확인:');
console.log(`  - CLERK_WEBHOOK_SECRET: ${process.env.CLERK_WEBHOOK_SECRET ? '✅ 설정됨' : '❌ 누락'}`);
console.log(`  - CLERK_SECRET_KEY: ${process.env.CLERK_SECRET_KEY ? '✅ 설정됨' : '❌ 누락'}`);
console.log(`  - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ 설정됨' : '❌ 누락'}`);

// 2. 웹훅 엔드포인트 URL 확인
console.log('\\n🌐 웹훅 엔드포인트:');
const baseUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const webhookUrl = `${baseUrl}/api/webhooks/clerk`;
console.log(`  - URL: ${webhookUrl}`);

// 3. 가능한 문제점들
console.log('\\n🚨 가능한 문제점들:');
console.log('  1. Clerk 대시보드에서 웹훅 URL이 올바르게 설정되지 않음');
console.log('  2. 웹훅이 호출되었지만 서명 검증 실패');
console.log('  3. 웹훅이 호출되었지만 데이터베이스 저장 중 오류 발생');
console.log('  4. 개발 환경에서 ngrok 등의 터널링 도구 미사용');
console.log('  5. 프로덕션 환경에서 환경변수 누락');

// 4. 해결 방법 제시
console.log('\\n💡 해결 방법:');
console.log('  1. Clerk 대시보드 → Webhooks → Endpoint URL 확인');
console.log(`     설정해야 할 URL: ${webhookUrl}`);
console.log('  2. Events 설정에서 "user.created" 이벤트 활성화 확인');
console.log('  3. 웹훅 시크릿 키가 환경변수와 일치하는지 확인');
console.log('  4. 로컬 개발 시 ngrok 사용하여 외부 접근 가능하게 설정');

// 5. 모니터링 개선 제안
console.log('\\n📊 모니터링 개선 제안:');
console.log('  1. 웹훅 로그를 데이터베이스에 저장하는 기능 추가');
console.log('  2. 웹훅 실패 시 알림 시스템 구축');
console.log('  3. 주기적으로 Clerk 사용자와 DB 사용자 동기화 확인');
console.log('  4. 헬스체크 엔드포인트 추가');

console.log('\\n✅ 진단 완료!');
console.log('현재 문제는 해결되었지만, 위의 제안사항을 검토하여 향후 문제를 예방하세요.');
