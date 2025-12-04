/**
 * 종합적인 웹훅 모니터링 스크립트
 * 새 사용자 가입과 웹훅 상태를 동시에 모니터링합니다.
 */

import { db } from '../src/db/index.js';
import { userProfiles, userRoles } from '../src/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { createClerkClient } from '@clerk/backend';

let lastCheckTime = new Date();
let totalChecks = 0;
let newUsersDetected = 0;

async function checkWebhookHealth() {
  try {
    const response = await fetch('https://towny-kr.vercel.app/api/webhooks/clerk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': 'health_check_' + Date.now(),
        'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
        'svix-signature': 'v1,health_check'
      },
      body: JSON.stringify({ type: 'health_check', data: {} })
    });
    
    const text = await response.text();
    
    if (text.includes('Invalid webhook signature')) {
      return { status: 'healthy', message: '웹훅 엔드포인트 정상' };
    } else if (text.includes('Webhook secret not configured')) {
      return { status: 'error', message: '환경변수 미설정' };
    } else {
      return { status: 'unknown', message: `알 수 없는 응답: ${text}` };
    }
  } catch (error) {
    return { status: 'error', message: `연결 실패: ${error.message}` };
  }
}

async function checkClerkUsers() {
  try {
    const clerkClient = createClerkClient({ 
      secretKey: process.env.CLERK_SECRET_KEY 
    });
    
    const users = await clerkClient.users.getUserList({ 
      limit: 5,
      orderBy: '-created_at'
    });
    
    const recentUsers = users.data.filter(user => 
      new Date(user.createdAt) > lastCheckTime
    );
    
    return recentUsers;
  } catch (error) {
    console.log(`   ⚠️ Clerk API 오류: ${error.message}`);
    return [];
  }
}

async function checkDatabaseUsers() {
  try {
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
    
    return recentUsers;
  } catch (error) {
    console.log(`   ⚠️ 데이터베이스 오류: ${error.message}`);
    return [];
  }
}

async function verifyUserRole(clerkUserId) {
  try {
    const userRole = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.clerkUserId, clerkUserId))
      .limit(1);
    
    return userRole.length > 0 ? userRole[0] : null;
  } catch (error) {
    return null;
  }
}

async function comprehensiveMonitor() {
  totalChecks++;
  const timestamp = new Date().toLocaleTimeString('ko-KR');
  
  console.log(`\\n[${timestamp}] 🔍 검사 #${totalChecks} 실행 중...`);
  
  // 1. 웹훅 상태 확인
  const webhookHealth = await checkWebhookHealth();
  const healthIcon = webhookHealth.status === 'healthy' ? '✅' : 
                    webhookHealth.status === 'error' ? '❌' : '⚠️';
  console.log(`   ${healthIcon} 웹훅 상태: ${webhookHealth.message}`);
  
  // 2. Clerk에서 새 사용자 확인
  const newClerkUsers = await checkClerkUsers();
  console.log(`   👥 새 Clerk 사용자: ${newClerkUsers.length}명`);
  
  // 3. 데이터베이스에서 새 사용자 확인
  const newDbUsers = await checkDatabaseUsers();
  console.log(`   🗄️ 새 DB 사용자: ${newDbUsers.length}명`);
  
  // 4. 새 사용자 발견 시 상세 정보 표시
  if (newDbUsers.length > 0) {
    newUsersDetected += newDbUsers.length;
    console.log(`\\n🎉 새로운 사용자 ${newDbUsers.length}명 감지! (총 ${newUsersDetected}명)`);
    console.log('='.repeat(50));
    
    for (const user of newDbUsers) {
      console.log(`\\n👤 사용자 정보:`);
      console.log(`   ID: ${user.clerkUserId}`);
      console.log(`   이메일: ${user.email}`);
      console.log(`   이름: ${user.name || '없음'}`);
      console.log(`   가입방법: ${user.signupMethod}`);
      console.log(`   생성시간: ${new Date(user.createdAt).toLocaleString('ko-KR')}`);
      
      // 역할 정보 확인
      const userRole = await verifyUserRole(user.clerkUserId);
      if (userRole) {
        console.log(`   역할: ${userRole.role}`);
        console.log(`   ✅ 웹훅이 정상적으로 처리되었습니다!`);
      } else {
        console.log(`   ❌ 역할 정보가 없습니다. 웹훅 처리에 문제가 있을 수 있습니다.`);
      }
    }
    
    // 마지막 확인 시간 업데이트
    lastCheckTime = new Date(Math.max(...newDbUsers.map(u => new Date(u.createdAt))));
    
    console.log('\\n🔔 웹훅 동작 확인됨! 계속 모니터링 중...');
  }
  
  // 5. Clerk와 DB 동기화 상태 확인
  if (newClerkUsers.length > 0 && newDbUsers.length === 0) {
    console.log(`\\n⚠️ 주의: Clerk에 새 사용자 ${newClerkUsers.length}명이 있지만 DB에는 추가되지 않았습니다.`);
    console.log('   웹훅이 제대로 호출되지 않았을 가능성이 있습니다.');
    
    newClerkUsers.forEach((user, index) => {
      const email = user.emailAddresses[0]?.emailAddress || '이메일 없음';
      console.log(`   ${index + 1}. ${user.id} (${email})`);
    });
  }
  
  // 6. 통계 정보 (10회마다 표시)
  if (totalChecks % 10 === 0) {
    console.log(`\\n📊 모니터링 통계 (${totalChecks}회 검사):`);
    console.log(`   - 감지된 새 사용자: ${newUsersDetected}명`);
    console.log(`   - 모니터링 시간: ${Math.floor((Date.now() - startTime) / 1000)}초`);
    console.log(`   - 웹훅 상태: ${webhookHealth.status}`);
  }
}

// 시작 시간 기록
const startTime = Date.now();

async function startComprehensiveMonitoring() {
  console.log('🚀 종합 웹훅 모니터링 시작...');
  console.log('='.repeat(60));
  console.log(`시작 시간: ${new Date().toLocaleString('ko-KR')}`);
  console.log('\\n📋 모니터링 항목:');
  console.log('   ✅ 웹훅 엔드포인트 상태');
  console.log('   ✅ 새 Clerk 사용자 감지');
  console.log('   ✅ 새 DB 사용자 감지');
  console.log('   ✅ 사용자 역할 정보 확인');
  console.log('   ✅ 동기화 상태 분석');
  console.log('\\n새로운 사용자 가입을 기다리는 중... (Ctrl+C로 종료)');
  
  // 초기 웹훅 상태 확인
  const initialHealth = await checkWebhookHealth();
  console.log(`\\n🔧 초기 웹훅 상태: ${initialHealth.message}`);
  
  // 3초마다 모니터링 실행
  const interval = setInterval(comprehensiveMonitor, 3000);
  
  // Ctrl+C 처리
  process.on('SIGINT', () => {
    console.log('\\n\\n🛑 모니터링을 종료합니다.');
    console.log(`📊 최종 통계:`);
    console.log(`   - 총 검사 횟수: ${totalChecks}회`);
    console.log(`   - 감지된 새 사용자: ${newUsersDetected}명`);
    console.log(`   - 총 모니터링 시간: ${Math.floor((Date.now() - startTime) / 1000)}초`);
    clearInterval(interval);
    process.exit(0);
  });
}

// 환경변수 확인
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 필요합니다.');
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

startComprehensiveMonitoring().catch(console.error);
