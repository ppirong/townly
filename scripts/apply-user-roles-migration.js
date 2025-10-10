/**
 * 사용자 역할 마이그레이션 스크립트
 * 기존 사용자들에게 기본 역할(customer)을 부여합니다.
 */
const { Pool } = require('pg');
const { config } = require('dotenv');
const path = require('path');

// 환경 변수 로드
config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyUserRolesMigration() {
  const client = await pool.connect();
  
  try {
    console.log('사용자 역할 마이그레이션을 시작합니다...');
    
    // 1. 사용자 위치 테이블에서 모든 Clerk 사용자 ID 가져오기
    const { rows: userLocations } = await client.query(
      'SELECT DISTINCT clerk_user_id FROM user_locations'
    );
    
    // 2. 이메일 설정 테이블에서 모든 Clerk 사용자 ID 가져오기
    const { rows: userEmailSettings } = await client.query(
      'SELECT DISTINCT clerk_user_id FROM user_email_settings'
    );
    
    // 3. 중복 제거 후 모든 사용자 ID 목록 생성
    const allUserIds = new Set([
      ...userLocations.map(u => u.clerk_user_id),
      ...userEmailSettings.map(u => u.clerk_user_id)
    ].filter(Boolean));
    
    console.log(`총 ${allUserIds.size}명의 사용자를 발견했습니다.`);
    
    // 4. 각 사용자에 대해 기본 역할 부여
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const userId of allUserIds) {
      // 이미 역할이 있는지 확인
      const { rows } = await client.query(
        'SELECT * FROM user_roles WHERE clerk_user_id = $1',
        [userId]
      );
      
      if (rows.length > 0) {
        skippedCount++;
        continue; // 이미 역할이 있으면 건너뛰기
      }
      
      // 새 역할 삽입
      await client.query(
        `INSERT INTO user_roles (id, clerk_user_id, role, created_at, updated_at) 
         VALUES (gen_random_uuid(), $1, 'customer', NOW(), NOW())`,
        [userId]
      );
      insertedCount++;
    }
    
    console.log(`마이그레이션 완료: ${insertedCount}명의 사용자에게 역할 부여, ${skippedCount}명 건너뜀`);
    
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// 스크립트 실행
applyUserRolesMigration().catch(console.error);