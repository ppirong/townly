/**
 * 새로운 회원가입 실시간 모니터링 스크립트
 */

import { db } from '../src/db/index.js';
import { userProfiles, userRoles } from '../src/db/schema.js';
import { desc, eq } from 'drizzle-orm';

let lastCheckTime = new Date();

async function monitorNewSignups() {
  console.log('👀 새로운 회원가입 실시간 모니터링 시작...');
  console.log('='.repeat(50));
  console.log(`시작 시간: ${lastCheckTime.toLocaleString('ko-KR')}`);
  console.log('\\n새로운 사용자 가입을 기다리는 중...');
  console.log('(Ctrl+C로 종료)\\n');
  
  const checkInterval = setInterval(async () => {
    try {
      // 마지막 확인 시간 이후 생성된 사용자 조회
      const newUsers = await db
        .select({
          id: userProfiles.id,
          clerkUserId: userProfiles.clerkUserId,
          email: userProfiles.email,
          name: userProfiles.name,
          signupMethod: userProfiles.signupMethod,
          createdAt: userProfiles.createdAt,
        })
        .from(userProfiles)
        .orderBy(desc(userProfiles.createdAt))
        .limit(5);
      
      const recentUsers = newUsers.filter(user => 
        new Date(user.createdAt) > lastCheckTime
      );
      
      if (recentUsers.length > 0) {
        console.log(`🎉 새로운 사용자 ${recentUsers.length}명 감지!`);
        console.log(`감지 시간: ${new Date().toLocaleString('ko-KR')}`);
        console.log('-'.repeat(40));
        
        for (const user of recentUsers) {
          console.log(`👤 사용자 정보:`);
          console.log(`   ID: ${user.clerkUserId}`);
          console.log(`   이메일: ${user.email}`);
          console.log(`   이름: ${user.name || '없음'}`);
          console.log(`   가입방법: ${user.signupMethod}`);
          console.log(`   생성시간: ${new Date(user.createdAt).toLocaleString('ko-KR')}`);
          
          // 해당 사용자의 역할 정보도 확인
          const userRole = await db
            .select()
            .from(userRoles)
            .where(eq(userRoles.clerkUserId, user.clerkUserId))
            .limit(1);
          
          if (userRole.length > 0) {
            console.log(`   역할: ${userRole[0].role}`);
            console.log(`   ✅ 웹훅이 정상적으로 처리되었습니다!`);
          } else {
            console.log(`   ❌ 역할 정보가 없습니다. 웹훅 처리에 문제가 있을 수 있습니다.`);
          }
          
          console.log('');
        }
        
        // 마지막 확인 시간 업데이트
        lastCheckTime = new Date(Math.max(...recentUsers.map(u => new Date(u.createdAt))));
      }
      
    } catch (error) {
      console.error('❌ 모니터링 중 오류 발생:', error.message);
    }
  }, 3000); // 3초마다 확인
  
  // Ctrl+C 처리
  process.on('SIGINT', () => {
    console.log('\\n\\n🛑 모니터링을 종료합니다.');
    clearInterval(checkInterval);
    process.exit(0);
  });
}

// 환경변수 확인
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 필요합니다.');
  process.exit(1);
}

monitorNewSignups().catch(console.error);
