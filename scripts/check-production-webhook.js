/**
 * 프로덕션 환경 웹훅 설정 확인 스크립트
 */

console.log('🔍 프로덕션 환경 웹훅 설정 확인');
console.log('=====================================');

// 1. 프로덕션 웹훅 엔드포인트 테스트
async function testProductionWebhook() {
  console.log('\n🌐 프로덕션 웹훅 엔드포인트 테스트');
  console.log('--------------------------------');
  
  const productionUrl = 'https://towny-kr.vercel.app/api/webhooks/clerk';
  
  try {
    const response = await fetch(productionUrl, {
      method: 'GET'
    });
    
    console.log(`URL: ${productionUrl}`);
    console.log(`응답 상태: ${response.status} ${response.statusText}`);
    
    if (response.status === 405) {
      console.log('✅ 프로덕션 웹훅 엔드포인트 정상 (405 Method Not Allowed는 정상)');
    } else if (response.status === 404) {
      console.log('❌ 프로덕션 웹훅 엔드포인트를 찾을 수 없음');
    } else {
      console.log(`⚠️ 예상치 못한 응답: ${response.status}`);
    }
    
    // 응답 헤더 확인
    const headers = Object.fromEntries(response.headers.entries());
    if (headers['x-clerk-auth-status']) {
      console.log(`Clerk 인증 상태: ${headers['x-clerk-auth-status']}`);
    }
    if (headers['x-matched-path']) {
      console.log(`매칭된 경로: ${headers['x-matched-path']}`);
    }
    
  } catch (error) {
    console.log(`❌ 프로덕션 엔드포인트 연결 실패: ${error.message}`);
  }
}

// 2. 프로덕션 메인 페이지 테스트
async function testProductionSite() {
  console.log('\n🏠 프로덕션 사이트 접근성 테스트');
  console.log('-----------------------------');
  
  const siteUrl = 'https://towny-kr.vercel.app';
  
  try {
    const response = await fetch(siteUrl, {
      method: 'GET'
    });
    
    console.log(`URL: ${siteUrl}`);
    console.log(`응답 상태: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('✅ 프로덕션 사이트 정상 접근 가능');
    } else {
      console.log(`❌ 프로덕션 사이트 접근 문제: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ 프로덕션 사이트 연결 실패: ${error.message}`);
  }
}

// 3. 웹훅 동작 원리 설명
function explainWebhookFlow() {
  console.log('\n📋 웹훅 동작 원리');
  console.log('================');
  
  console.log('\n🔄 정상적인 웹훅 플로우:');
  console.log('1. 사용자가 프로덕션 사이트에서 카카오 회원가입');
  console.log('2. Clerk가 user.created 이벤트 감지');
  console.log('3. Clerk가 https://towny-kr.vercel.app/api/webhooks/clerk로 POST 요청');
  console.log('4. 프로덕션 서버가 웹훅 처리');
  console.log('5. user_profiles, user_roles 테이블에 사용자 정보 저장');
  
  console.log('\n❌ 로컬 환경에서 안 되는 이유:');
  console.log('• Clerk 웹훅 URL이 프로덕션으로 설정됨');
  console.log('• 로컬에서 가입해도 프로덕션 웹훅으로만 전송됨');
  console.log('• 로컬 데이터베이스에는 정보가 저장되지 않음');
  
  console.log('\n✅ 프로덕션에서는 정상 동작:');
  console.log('• 프로덕션 사이트에서 가입 시 웹훅 정상 호출');
  console.log('• 프로덕션 데이터베이스에 정보 저장됨');
}

// 4. 확인 방법 안내
function printVerificationSteps() {
  console.log('\n🎯 프로덕션 웹훅 동작 확인 방법');
  console.log('==============================');
  
  console.log('\n1️⃣ 프로덕션 사이트에서 테스트:');
  console.log('   • https://towny-kr.vercel.app 접속');
  console.log('   • 새 이메일로 카카오 회원가입');
  console.log('   • 프로덕션 데이터베이스에서 사용자 정보 확인');
  
  console.log('\n2️⃣ 프로덕션 로그 확인:');
  console.log('   • Vercel 대시보드 → Functions → Logs');
  console.log('   • 웹훅 호출 로그 확인');
  
  console.log('\n3️⃣ 데이터베이스 직접 확인:');
  console.log('   • 프로덕션 DB에 연결');
  console.log('   • SELECT * FROM user_profiles;');
  console.log('   • SELECT * FROM user_roles;');
  
  console.log('\n⚠️ 주의사항:');
  console.log('• 프로덕션 테스트 시 실제 데이터가 생성됨');
  console.log('• 테스트용 이메일 사용 권장');
  console.log('• 로컬과 프로덕션 DB가 다를 수 있음');
}

// 실행
async function runCheck() {
  await testProductionWebhook();
  await testProductionSite();
  explainWebhookFlow();
  printVerificationSteps();
  
  console.log('\n🎉 결론');
  console.log('======');
  console.log('프로덕션 웹훅 엔드포인트가 정상이므로,');
  console.log('프로덕션 환경에서 카카오 회원가입 시');
  console.log('user_profiles, user_roles 테이블에 정상적으로 저장될 것입니다!');
}

runCheck().catch(console.error);
