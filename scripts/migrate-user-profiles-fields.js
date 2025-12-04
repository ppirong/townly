/**
 * user_profiles 테이블 필드 변경 마이그레이션 스크립트
 * - first_name, last_name 제거
 * - name, mobile_phone 추가
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrateUserProfilesFields() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('데이터베이스에 연결되었습니다.');

    // 트랜잭션 시작
    await client.query('BEGIN');

    try {
      // 1. 기존 데이터 백업 (first_name + last_name을 name으로 통합)
      console.log('기존 데이터를 name 필드로 통합 중...');
      
      // name 컬럼 추가
      await client.query(`
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS name text;
      `);
      
      // mobile_phone 컬럼 추가
      await client.query(`
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS mobile_phone text;
      `);

      // 기존 first_name, last_name 데이터를 name으로 통합
      await client.query(`
        UPDATE user_profiles 
        SET name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        WHERE (first_name IS NOT NULL OR last_name IS NOT NULL)
        AND (name IS NULL OR name = '');
      `);

      // 빈 문자열을 NULL로 변경
      await client.query(`
        UPDATE user_profiles 
        SET name = NULL 
        WHERE name = '' OR name = '  ';
      `);

      console.log('데이터 통합이 완료되었습니다.');

      // 2. 기존 컬럼 제거
      console.log('기존 컬럼 제거 중...');
      
      // first_name 컬럼이 존재하는지 확인 후 제거
      const firstNameExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'first_name';
      `);
      
      if (firstNameExists.rows.length > 0) {
        await client.query(`
          ALTER TABLE user_profiles 
          DROP COLUMN first_name;
        `);
        console.log('first_name 컬럼이 제거되었습니다.');
      }

      // last_name 컬럼이 존재하는지 확인 후 제거
      const lastNameExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'last_name';
      `);
      
      if (lastNameExists.rows.length > 0) {
        await client.query(`
          ALTER TABLE user_profiles 
          DROP COLUMN last_name;
        `);
        console.log('last_name 컬럼이 제거되었습니다.');
      }

      // 3. 변경 결과 확인
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        ORDER BY ordinal_position;
      `);

      console.log('\n=== user_profiles 테이블 구조 ===');
      result.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });

      // 4. 데이터 확인
      const dataResult = await client.query(`
        SELECT id, clerk_user_id, email, name, mobile_phone
        FROM user_profiles 
        LIMIT 5;
      `);

      console.log('\n=== 샘플 데이터 ===');
      dataResult.rows.forEach(row => {
        console.log(`- ${row.clerk_user_id}: name="${row.name}", mobile="${row.mobile_phone}"`);
      });

      // 트랜잭션 커밋
      await client.query('COMMIT');
      console.log('\n✅ 마이그레이션이 성공적으로 완료되었습니다.');

    } catch (error) {
      // 트랜잭션 롤백
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    await client.end();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
}

migrateUserProfilesFields();
