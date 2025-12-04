/**
 * 기존 카카오 사용자들의 signup_method를 일회성으로 수정하는 스크립트
 * 
 * 실행 방법:
 * DATABASE_URL="..." CLERK_SECRET_KEY="..." node scripts/fix-existing-kakao-users.js
 */

const { clerkClient } = require('@clerk/clerk-sdk-node');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixExistingKakaoUsers() {
  console.log('🔧 기존 카카오 사용자들의 signup_method 수정 시작...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 완료');

    // 1. 현재 signup_method가 'email'인 사용자들 조회
    const emailUsersQuery = `
      SELECT clerk_user_id, email, name, signup_method 
      FROM user_profiles 
      WHERE signup_method = 'email'
      ORDER BY created_at DESC
    `;
    
    const emailUsersResult = await client.query(emailUsersQuery);
    const emailUsers = emailUsersResult.rows;
    
    console.log(`📊 signup_method가 'email'인 사용자: ${emailUsers.length}명`);
    
    if (emailUsers.length === 0) {
      console.log('✅ 수정할 사용자가 없습니다.');
      return;
    }

    // 2. 각 사용자의 Clerk 정보 확인
    let fixedCount = 0;
    let checkedCount = 0;
    
    for (const dbUser of emailUsers) {
      checkedCount++;
      console.log(`\n[${checkedCount}/${emailUsers.length}] 확인 중: ${dbUser.email} (${dbUser.clerk_user_id})`);
      
      try {
        // Clerk에서 사용자 정보 조회
        const clerkUser = await clerkClient.users.getUser(dbUser.clerk_user_id);
        
        // 카카오 계정 확인
        const hasKakaoAccount = clerkUser.externalAccounts?.some(account => 
          String(account.provider) === 'oauth_kakao' || 
          String(account.provider) === 'kakao' ||
          String(account.provider) === 'oauth_custom_kakao' ||
          String(account.provider).includes('kakao')
        );
        
        if (hasKakaoAccount) {
          console.log(`  🎯 카카오 계정 감지! signup_method를 'kakao'로 수정합니다.`);
          
          // signup_method를 'kakao'로 업데이트
          const updateQuery = `
            UPDATE user_profiles 
            SET signup_method = 'kakao', updated_at = NOW()
            WHERE clerk_user_id = $1
          `;
          
          await client.query(updateQuery, [dbUser.clerk_user_id]);
          fixedCount++;
          
          console.log(`  ✅ 수정 완료`);
        } else {
          console.log(`  ℹ️ 이메일 사용자 (수정 불필요)`);
        }
        
      } catch (error) {
        console.error(`  ❌ 사용자 ${dbUser.clerk_user_id} 처리 실패:`, error.message);
      }
      
      // API 호출 제한을 위한 지연
      if (checkedCount % 10 === 0) {
        console.log('⏳ API 호출 제한을 위해 2초 대기...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 3. 최종 결과 확인
    console.log('\n📊 최종 결과:');
    console.log(`  - 확인한 사용자: ${checkedCount}명`);
    console.log(`  - 수정한 사용자: ${fixedCount}명`);
    
    // 수정 후 통계
    const finalStatsQuery = `
      SELECT 
        signup_method,
        COUNT(*) as count
      FROM user_profiles 
      GROUP BY signup_method
      ORDER BY signup_method
    `;
    
    const finalStatsResult = await client.query(finalStatsQuery);
    
    console.log('\n📈 수정 후 signup_method 통계:');
    finalStatsResult.rows.forEach(row => {
      console.log(`  - ${row.signup_method}: ${row.count}명`);
    });
    
    if (fixedCount > 0) {
      console.log(`\n🎉 ${fixedCount}명의 카카오 사용자 signup_method가 성공적으로 수정되었습니다!`);
    } else {
      console.log('\n✅ 수정이 필요한 사용자가 없었습니다.');
    }
    
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error);
  } finally {
    await client.end();
    console.log('🔌 데이터베이스 연결 종료');
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

fixExistingKakaoUsers();
