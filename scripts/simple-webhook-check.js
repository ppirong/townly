/**
 * 간단한 웹훅 설정 확인 스크립트
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 웹훅 설정 간단 진단');
console.log('======================');

// .env.local 파일 읽기
const envPath = path.join(__dirname, '..', '.env.local');
let envVars = {};

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.log('❌ .env.local 파일을 읽을 수 없습니다');
}

console.log('\n📋 환경변수 확인:');
console.log(`CLERK_WEBHOOK_SECRET: ${envVars.CLERK_WEBHOOK_SECRET ? '✅ 설정됨' : '❌ 없음'}`);
console.log(`CLERK_SECRET_KEY: ${envVars.CLERK_SECRET_KEY ? '✅ 설정됨' : '❌ 없음'}`);

if (envVars.CLERK_WEBHOOK_SECRET) {
  console.log(`  - 웹훅 시크릿 형식: ${envVars.CLERK_WEBHOOK_SECRET.startsWith('whsec_') ? '✅ 올바름' : '❌ 잘못됨'}`);
}

// 웹훅 엔드포인트 테스트
console.log('\n🌐 웹훅 엔드포인트 테스트:');

async function testEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
      method: 'GET'
    });
    
    console.log(`응답 상태: ${response.status} ${response.statusText}`);
    
    if (response.status === 405) {
      console.log('✅ 엔드포인트 정상 (405는 GET 요청 거부, 정상)');
    } else {
      console.log('⚠️ 예상과 다른 응답');
    }
  } catch (error) {
    console.log(`❌ 엔드포인트 접근 실패: ${error.message}`);
  }
}

// 서버 실행 상태 확인
console.log('\n🖥️ 서버 상태 확인:');
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/', {
      method: 'GET'
    });
    console.log(`메인 페이지 응답: ${response.status} ${response.statusText}`);
    console.log('✅ Next.js 서버가 실행 중입니다');
  } catch (error) {
    console.log('❌ Next.js 서버가 실행되지 않고 있습니다');
    console.log('   npm run dev 명령으로 서버를 시작하세요');
  }
}

async function runCheck() {
  await checkServer();
  await testEndpoint();
  
  console.log('\n🎯 핵심 문제점:');
  console.log('웹훅이 전혀 호출되지 않는다면 99% Clerk 대시보드 설정 문제입니다');
  
  console.log('\n🔧 Clerk 대시보드 확인 방법:');
  console.log('1. https://dashboard.clerk.com 접속');
  console.log('2. 프로젝트 선택');
  console.log('3. 좌측 메뉴에서 "Webhooks" 클릭');
  console.log('4. 웹훅 엔드포인트가 설정되어 있는지 확인');
  console.log('');
  console.log('📋 확인해야 할 설정:');
  console.log('• Endpoint URL: http://localhost:3000/api/webhooks/clerk');
  console.log('• Events: user.created 체크박스 활성화');
  console.log('• Signing Secret: 환경변수와 일치하는지 확인');
  
  console.log('\n⚠️ 로컬 개발 시 주의사항:');
  console.log('Clerk는 localhost에 직접 접근할 수 없습니다!');
  console.log('ngrok 등을 사용해서 로컬 서버를 외부에 노출해야 합니다.');
  
  console.log('\n🚀 ngrok 사용 방법:');
  console.log('1. ngrok 설치: https://ngrok.com/');
  console.log('2. 터미널에서: ngrok http 3000');
  console.log('3. 생성된 https URL을 Clerk 웹훅 설정에 입력');
  console.log('   예: https://abc123.ngrok.io/api/webhooks/clerk');
}

runCheck().catch(console.error);
