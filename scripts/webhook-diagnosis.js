/**
 * 웹훅 설정 진단 스크립트
 * 웹훅이 호출되지 않는 원인을 체계적으로 진단합니다.
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 웹훅 설정 진단 시작');
console.log('=====================================');

// 1. 환경변수 확인
console.log('\n📋 1. 환경변수 확인');
console.log('-------------------');

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

console.log(`CLERK_WEBHOOK_SECRET: ${webhookSecret ? '✅ 설정됨' : '❌ 없음'}`);
if (webhookSecret) {
  console.log(`  - 형식: ${webhookSecret.startsWith('whsec_') ? '✅ 올바름' : '❌ 잘못됨'}`);
  console.log(`  - 길이: ${webhookSecret.length}자`);
}

console.log(`CLERK_SECRET_KEY: ${clerkSecretKey ? '✅ 설정됨' : '❌ 없음'}`);
if (clerkSecretKey) {
  console.log(`  - 형식: ${clerkSecretKey.startsWith('sk_') ? '✅ 올바름' : '❌ 잘못됨'}`);
}

console.log(`NEXT_PUBLIC_APP_URL: ${appUrl || 'http://localhost:3000 (기본값)'}`);

// 2. 웹훅 엔드포인트 접근성 테스트
console.log('\n🌐 2. 웹훅 엔드포인트 접근성 테스트');
console.log('--------------------------------');

async function testWebhookEndpoint() {
  const baseUrl = appUrl || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhooks/clerk`;
  
  console.log(`테스트 URL: ${webhookUrl}`);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    console.log(`응답 상태: ${response.status} ${response.statusText}`);
    
    if (response.status === 405) {
      console.log('✅ 엔드포인트 존재함 (405 Method Not Allowed는 정상)');
    } else if (response.status === 404) {
      console.log('❌ 엔드포인트를 찾을 수 없음');
    } else {
      console.log(`⚠️ 예상치 못한 응답: ${response.status}`);
    }
    
    const responseText = await response.text();
    if (responseText) {
      console.log(`응답 내용: ${responseText.substring(0, 200)}`);
    }
    
  } catch (error) {
    console.log(`❌ 연결 실패: ${error.message}`);
  }
}

// 3. Clerk 사용자 목록 확인
console.log('\n👥 3. Clerk 사용자 목록 확인');
console.log('-------------------------');

async function checkClerkUsers() {
  if (!clerkSecretKey) {
    console.log('❌ CLERK_SECRET_KEY가 없어서 사용자 목록을 확인할 수 없습니다');
    return;
  }
  
  try {
    const { createClerkClient } = await import('@clerk/nextjs/server');
    const clerkClient = createClerkClient({ secretKey: clerkSecretKey });
    
    const users = await clerkClient.users.getUserList({ limit: 10 });
    
    console.log(`총 사용자 수: ${users.totalCount}`);
    console.log('최근 사용자들:');
    
    users.data.forEach((user, index) => {
      const email = user.primaryEmailAddress?.emailAddress || 'No email';
      const createdAt = new Date(user.createdAt).toLocaleString('ko-KR');
      const externalAccounts = user.externalAccounts?.map(acc => acc.provider).join(', ') || 'none';
      
      console.log(`  ${index + 1}. ${email}`);
      console.log(`     생성일: ${createdAt}`);
      console.log(`     외부 계정: ${externalAccounts}`);
      console.log(`     ID: ${user.id}`);
      console.log('');
    });
    
    // ppirong@daum.net 사용자 찾기
    const ppirongUser = users.data.find(user => 
      user.primaryEmailAddress?.emailAddress === 'ppirong@daum.net'
    );
    
    if (ppirongUser) {
      console.log('🎯 ppirong@daum.net 사용자 발견!');
      console.log(`   생성일: ${new Date(ppirongUser.createdAt).toLocaleString('ko-KR')}`);
      console.log(`   외부 계정: ${ppirongUser.externalAccounts?.map(acc => acc.provider).join(', ') || 'none'}`);
      console.log(`   ID: ${ppirongUser.id}`);
    } else {
      console.log('❌ ppirong@daum.net 사용자를 찾을 수 없습니다');
    }
    
  } catch (error) {
    console.log(`❌ Clerk 사용자 목록 조회 실패: ${error.message}`);
  }
}

// 4. 데이터베이스 사용자 확인
console.log('\n🗄️ 4. 데이터베이스 사용자 확인');
console.log('---------------------------');

async function checkDatabaseUsers() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL이 없어서 데이터베이스를 확인할 수 없습니다');
    return;
  }
  
  try {
    const { db } = await import('../src/db/index.js');
    const { userProfiles, userRoles } = await import('../src/db/schema.js');
    
    const profiles = await db.select().from(userProfiles);
    const roles = await db.select().from(userRoles);
    
    console.log(`user_profiles 테이블: ${profiles.length}개 레코드`);
    console.log(`user_roles 테이블: ${roles.length}개 레코드`);
    
    // ppirong@daum.net 프로필 찾기
    const ppirongProfile = profiles.find(profile => profile.email === 'ppirong@daum.net');
    
    if (ppirongProfile) {
      console.log('🎯 ppirong@daum.net 프로필 발견!');
      console.log(`   생성일: ${new Date(ppirongProfile.createdAt).toLocaleString('ko-KR')}`);
      console.log(`   가입 방법: ${ppirongProfile.signupMethod}`);
      console.log(`   Clerk ID: ${ppirongProfile.clerkUserId}`);
    } else {
      console.log('❌ ppirong@daum.net 프로필을 찾을 수 없습니다');
    }
    
  } catch (error) {
    console.log(`❌ 데이터베이스 확인 실패: ${error.message}`);
  }
}

// 5. 진단 결과 요약
function printDiagnosisResult() {
  console.log('\n📊 5. 진단 결과 및 권장 조치');
  console.log('============================');
  
  console.log('\n🔧 Clerk 대시보드에서 확인해야 할 사항:');
  console.log('1. https://dashboard.clerk.com 접속');
  console.log('2. 프로젝트 선택 → Webhooks 메뉴');
  console.log('3. 웹훅 엔드포인트 설정 확인:');
  console.log(`   - URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/clerk`);
  console.log('   - Events: user.created 활성화 여부');
  console.log('   - Signing Secret과 환경변수 일치 여부');
  
  console.log('\n🎯 가능한 원인들:');
  console.log('• 웹훅 엔드포인트가 설정되지 않음');
  console.log('• user.created 이벤트가 비활성화됨');
  console.log('• 잘못된 웹훅 URL 설정');
  console.log('• 네트워크 접근 불가 (ngrok 필요할 수 있음)');
  console.log('• Signing Secret 불일치');
  
  console.log('\n🚀 다음 단계:');
  console.log('1. Clerk 대시보드 웹훅 설정 확인');
  console.log('2. 필요시 ngrok으로 로컬 서버 노출');
  console.log('3. 테스트 웹훅 발송으로 연결성 확인');
}

// 진단 실행
async function runDiagnosis() {
  await testWebhookEndpoint();
  await checkClerkUsers();
  await checkDatabaseUsers();
  printDiagnosisResult();
}

runDiagnosis().catch(console.error);
