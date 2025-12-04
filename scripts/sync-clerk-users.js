/**
 * Clerk 사용자와 데이터베이스 사용자 동기화 스크립트
 * 누락된 사용자를 찾아서 데이터베이스에 추가합니다.
 */

import { createClerkClient } from '@clerk/backend';
import { db } from '../src/db/index.js';
import { userProfiles, userRoles } from '../src/db/schema.js';
import { eq, notInArray } from 'drizzle-orm';
import { setUserRole } from '../src/lib/services/user-role-service.js';
import { createUserProfile } from '../src/db/queries/user-profiles.js';

async function syncClerkUsers() {
  console.log('🔄 Clerk 사용자 동기화 시작...');
  console.log('='.repeat(50));
  
  try {
    // Clerk 클라이언트 초기화
    const clerkClient = createClerkClient({ 
      secretKey: process.env.CLERK_SECRET_KEY 
    });
    
    // 1. Clerk에서 모든 사용자 가져오기
    console.log('📋 Clerk 사용자 목록 조회 중...');
    const clerkUsers = await clerkClient.users.getUserList({ limit: 100 });
    console.log(`✅ Clerk 사용자 ${clerkUsers.data.length}명 발견`);
    
    // 2. 데이터베이스에서 기존 사용자 ID 목록 가져오기
    console.log('🗄️ 데이터베이스 사용자 목록 조회 중...');
    const dbUsers = await db.select({ clerkUserId: userProfiles.clerkUserId }).from(userProfiles);
    const dbUserIds = dbUsers.map(user => user.clerkUserId);
    console.log(`✅ 데이터베이스 사용자 ${dbUserIds.length}명 발견`);
    
    // 3. 누락된 사용자 찾기
    const missingUsers = clerkUsers.data.filter(user => !dbUserIds.includes(user.id));
    console.log(`🔍 누락된 사용자 ${missingUsers.length}명 발견`);
    
    if (missingUsers.length === 0) {
      console.log('🎉 모든 사용자가 동기화되어 있습니다!');
      return;
    }
    
    // 4. 누락된 사용자들을 데이터베이스에 추가
    console.log('\\n📝 누락된 사용자 추가 중...');
    
    for (const user of missingUsers) {
      console.log(`\\n처리 중: ${user.id}`);
      
      try {
        // 카카오 계정 확인
        const kakaoAccount = user.externalAccounts.find(acc => 
          acc.provider === 'oauth_kakao' || 
          acc.provider === 'kakao' ||
          acc.provider === 'oauth_custom_kakao' ||
          acc.provider.includes('kakao')
        );
        
        const signupMethod = kakaoAccount ? 'kakao' : 'email';
        const email = user.emailAddresses[0]?.emailAddress || `${user.id}@temp.email`;
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 
                    (signupMethod === 'kakao' ? '카카오 사용자' : '사용자');
        
        // 역할 설정
        await setUserRole(user.id, 'customer');
        console.log(`  ✅ 역할 설정: customer`);
        
        // 프로필 생성
        await createUserProfile({
          clerkUserId: user.id,
          email,
          name,
          imageUrl: user.imageUrl,
          signupMethod,
        });
        console.log(`  ✅ 프로필 생성: ${email} (${signupMethod})`);
        
      } catch (error) {
        console.error(`  ❌ 사용자 ${user.id} 처리 실패:`, error.message);
      }
    }
    
    // 5. 최종 확인
    console.log('\\n📊 동기화 완료 후 통계:');
    const finalDbUsers = await db.select().from(userProfiles);
    const finalDbRoles = await db.select().from(userRoles);
    
    console.log(`  - 총 프로필 수: ${finalDbUsers.length}`);
    console.log(`  - 총 역할 수: ${finalDbRoles.length}`);
    console.log(`  - Clerk 사용자 수: ${clerkUsers.data.length}`);
    
    if (finalDbUsers.length === clerkUsers.data.length) {
      console.log('\\n🎉 완벽하게 동기화되었습니다!');
    } else {
      console.log('\\n⚠️ 일부 사용자가 여전히 누락되어 있을 수 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 동기화 실패:', error);
    throw error;
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

syncClerkUsers().catch(console.error);
