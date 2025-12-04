/**
 * 카카오 계정 감지 및 signup_method 수정 테스트 스크립트
 * 
 * 실행 방법:
 * DATABASE_URL="..." CLERK_SECRET_KEY="..." node scripts/test-kakao-detection.js
 */

const { clerkClient } = require('@clerk/clerk-sdk-node');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testKakaoDetection() {
  console.log('🧪 카카오 계정 감지 테스트 시작...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 완료');

    // 1. 모든 사용자 프로필 조회
    const profilesQuery = `
      SELECT clerk_user_id, email, name, signup_method, created_at 
      FROM user_profiles 
      ORDER BY created_at DESC
    `;
    
    const profilesResult = await client.query(profilesQuery);
    const profiles = profilesResult.rows;
    
    console.log(`\n📊 총 사용자 프로필: ${profiles.length}명`);
    
    if (profiles.length === 0) {
      console.log('❌ 테스트할 사용자가 없습니다.');
      return;
    }

    // 2. 각 사용자의 Clerk 정보와 비교
    console.log('\n🔍 사용자별 카카오 계정 감지 테스트:');
    
    let totalUsers = 0;
    let kakaoUsers = 0;
    let correctKakaoUsers = 0;
    let incorrectKakaoUsers = 0;
    
    for (const profile of profiles) {
      totalUsers++;
      console.log(`\n[${totalUsers}] ${profile.email} (${profile.clerk_user_id})`);
      console.log(`  📅 가입일: ${new Date(profile.created_at).toLocaleString('ko-KR')}`);
      console.log(`  📝 현재 signup_method: ${profile.signup_method}`);
      
      try {
        // Clerk에서 사용자 정보 조회
        const clerkUser = await clerkClient.users.getUser(profile.clerk_user_id);
        
        // 카카오 계정 확인
        const kakaoAccounts = clerkUser.externalAccounts?.filter(account => 
          String(account.provider) === 'oauth_kakao' || 
          String(account.provider) === 'kakao' ||
          String(account.provider) === 'oauth_custom_kakao' ||
          String(account.provider).includes('kakao')
        ) || [];
        
        const hasKakaoAccount = kakaoAccounts.length > 0;
        
        if (hasKakaoAccount) {
          kakaoUsers++;
          console.log(`  🎯 카카오 계정 감지됨:`);
          kakaoAccounts.forEach(acc => {
            console.log(`    - Provider: ${acc.provider}`);
            console.log(`    - 연결일: ${new Date(acc.createdAt).toLocaleString('ko-KR')}`);
          });
          
          if (profile.signup_method === 'kakao') {
            correctKakaoUsers++;
            console.log(`  ✅ signup_method 올바름 (kakao)`);
          } else {
            incorrectKakaoUsers++;
            console.log(`  ❌ signup_method 잘못됨 (${profile.signup_method} → kakao로 수정 필요)`);
          }
        } else {
          console.log(`  📧 이메일 사용자`);
          if (profile.signup_method === 'email') {
            console.log(`  ✅ signup_method 올바름 (email)`);
          } else {
            console.log(`  ⚠️ signup_method 이상함 (${profile.signup_method})`);
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Clerk 사용자 조회 실패:`, error.message);
      }
      
      // API 호출 제한을 위한 지연
      if (totalUsers % 5 === 0) {
        console.log('\n⏳ API 호출 제한을 위해 1초 대기...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 3. 최종 통계
    console.log('\n📈 테스트 결과 통계:');
    console.log(`  - 총 사용자: ${totalUsers}명`);
    console.log(`  - 카카오 사용자: ${kakaoUsers}명`);
    console.log(`  - 올바른 카카오 사용자: ${correctKakaoUsers}명`);
    console.log(`  - 수정 필요한 카카오 사용자: ${incorrectKakaoUsers}명`);
    console.log(`  - 이메일 사용자: ${totalUsers - kakaoUsers}명`);
    
    if (incorrectKakaoUsers > 0) {
      console.log(`\n🔧 ${incorrectKakaoUsers}명의 사용자가 signup_method 수정이 필요합니다.`);
      console.log('💡 이들은 다음 로그인 시 자동으로 수정됩니다.');
    } else {
      console.log('\n🎉 모든 사용자의 signup_method가 올바르게 설정되어 있습니다!');
    }
    
    // 4. signup_method별 통계
    const statsQuery = `
      SELECT 
        signup_method,
        COUNT(*) as count
      FROM user_profiles 
      GROUP BY signup_method
      ORDER BY signup_method
    `;
    
    const statsResult = await client.query(statsQuery);
    
    console.log('\n📊 현재 DB signup_method 통계:');
    statsResult.rows.forEach(row => {
      console.log(`  - ${row.signup_method}: ${row.count}명`);
    });
    
  } catch (error) {
    console.error('❌ 테스트 실행 실패:', error);
  } finally {
    await client.end();
    console.log('\n🔌 데이터베이스 연결 종료');
  }
}

// 환경변수 확인
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

testKakaoDetection();
