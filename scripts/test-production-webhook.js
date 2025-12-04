/**
 * 프로덕션 웹훅 동작 테스트 스크립트
 */

import { createClerkClient } from '@clerk/backend';
import { db } from '../src/db/index.js';
import { userProfiles, userRoles } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function testProductionWebhook() {
  console.log('🚀 프로덕션 웹훅 동작 테스트 시작...');
  console.log('='.repeat(60));
  
  try {
    // 1. Clerk 클라이언트 초기화
    const clerkClient = createClerkClient({ 
      secretKey: process.env.CLERK_SECRET_KEY 
    });
    
    // 2. 최근 생성된 Clerk 사용자들 확인 (최근 1시간)
    console.log('📋 최근 생성된 Clerk 사용자 확인 중...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentUsers = await clerkClient.users.getUserList({ 
      limit: 20,
      orderBy: '-created_at'
    });
    
    const veryRecentUsers = recentUsers.data.filter(user => 
      new Date(user.createdAt) > oneHourAgo
    );
    
    console.log(`✅ 최근 1시간 내 생성된 사용자: ${veryRecentUsers.length}명`);
    
    if (veryRecentUsers.length > 0) {
      console.log('\\n📊 최근 생성된 사용자들:');
      veryRecentUsers.forEach((user, index) => {
        const createdTime = new Date(user.createdAt).toLocaleString('ko-KR');
        const email = user.emailAddresses[0]?.emailAddress || '이메일 없음';
        const kakaoAccount = user.externalAccounts.find(acc => 
          acc.provider.includes('kakao')
        );
        const signupMethod = kakaoAccount ? '카카오' : '이메일';
        
        console.log(`  ${index + 1}. ${user.id}`);
        console.log(`     이메일: ${email}`);
        console.log(`     가입방법: ${signupMethod}`);
        console.log(`     생성시간: ${createdTime}`);
      });
    }
    
    // 3. 데이터베이스에서 동일한 기간의 사용자 확인
    console.log('\\n🗄️ 데이터베이스에서 최근 사용자 확인 중...');
    const recentDbUsers = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.createdAt, oneHourAgo)); // 최근 생성된 것들
    
    // 더 정확한 조회를 위해 모든 사용자를 가져와서 필터링
    const allDbUsers = await db.select().from(userProfiles);
    const recentDbUsersFiltered = allDbUsers.filter(user => 
      new Date(user.createdAt) > oneHourAgo
    );
    
    console.log(`✅ 최근 1시간 내 DB에 추가된 사용자: ${recentDbUsersFiltered.length}명`);
    
    if (recentDbUsersFiltered.length > 0) {
      console.log('\\n📊 DB에 추가된 사용자들:');
      recentDbUsersFiltered.forEach((user, index) => {
        const createdTime = new Date(user.createdAt).toLocaleString('ko-KR');
        console.log(`  ${index + 1}. ${user.clerkUserId}`);
        console.log(`     이메일: ${user.email}`);
        console.log(`     가입방법: ${user.signupMethod}`);
        console.log(`     생성시간: ${createdTime}`);
      });
    }
    
    // 4. 동기화 상태 분석
    console.log('\\n🔍 웹훅 동작 분석:');
    
    if (veryRecentUsers.length === 0) {
      console.log('ℹ️ 최근 1시간 내 새로 가입한 사용자가 없습니다.');
      console.log('   웹훅 테스트를 위해 새 사용자 가입이 필요합니다.');
    } else if (recentDbUsersFiltered.length === 0) {
      console.log('❌ Clerk에는 새 사용자가 있지만 DB에는 추가되지 않았습니다.');
      console.log('   웹훅이 제대로 동작하지 않고 있을 가능성이 높습니다.');
      
      // 누락된 사용자들 표시
      console.log('\\n🚨 누락된 사용자들:');
      for (const user of veryRecentUsers) {
        const existsInDb = allDbUsers.some(dbUser => dbUser.clerkUserId === user.id);
        if (!existsInDb) {
          console.log(`  - ${user.id} (${user.emailAddresses[0]?.emailAddress})`);
        }
      }
    } else if (veryRecentUsers.length === recentDbUsersFiltered.length) {
      console.log('✅ 완벽한 동기화! 웹훅이 정상 동작하고 있습니다.');
    } else {
      console.log('⚠️ 부분적 동기화. 일부 사용자가 누락되었을 수 있습니다.');
    }
    
    // 5. 전체 동기화 상태 확인
    console.log('\\n📈 전체 동기화 상태:');
    const totalClerkUsers = recentUsers.data.length;
    const totalDbUsers = allDbUsers.length;
    
    console.log(`  - 총 Clerk 사용자: ${totalClerkUsers}명 (최근 20명만 조회)`);
    console.log(`  - 총 DB 사용자: ${totalDbUsers}명`);
    
    // 6. 웹훅 URL 확인
    console.log('\\n🌐 현재 웹훅 설정 확인:');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_URL;
    const expectedUrl = isProduction 
      ? `https://${process.env.VERCEL_URL || 'your-domain.vercel.app'}/api/webhooks/clerk`
      : 'http://localhost:3000/api/webhooks/clerk';
    
    console.log(`  - 예상 웹훅 URL: ${expectedUrl}`);
    console.log(`  - 환경: ${isProduction ? '프로덕션' : '개발'}`);
    
    // 7. 권장사항
    console.log('\\n💡 권장사항:');
    if (veryRecentUsers.length > recentDbUsersFiltered.length) {
      console.log('  1. Clerk 대시보드에서 웹훅 엔드포인트 URL 확인');
      console.log('  2. 웹훅 이벤트에서 "user.created" 활성화 확인');
      console.log('  3. 웹훅 시크릿 키 일치 여부 확인');
      console.log('  4. 프로덕션 서버 로그에서 웹훅 호출 확인');
    } else {
      console.log('  1. 새 사용자로 회원가입 테스트 진행');
      console.log('  2. 서버 로그에서 웹훅 호출 로그 확인');
      console.log('  3. 정기적으로 동기화 상태 모니터링');
    }
    
  } catch (error) {
    console.error('❌ 웹훅 테스트 실패:', error);
    
    if (error.status === 401) {
      console.log('💡 Clerk API 인증 실패. CLERK_SECRET_KEY를 확인하세요.');
    } else {
      console.log('💡 기타 오류가 발생했습니다.');
    }
  }
}

// 환경변수 확인
if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 필요합니다.');
  process.exit(1);
}

testProductionWebhook().catch(console.error);
