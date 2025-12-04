/**
 * user_roles의 signup_method를 user_profiles로 이전하고 
 * user_roles에서 signup_method 필드를 제거하는 마이그레이션 스크립트
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrateSignupMethodToProfiles() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('데이터베이스에 연결되었습니다.');

    // 트랜잭션 시작
    await client.query('BEGIN');

    try {
      console.log('1. 현재 상태 확인...');
      
      // user_roles 데이터 확인
      const rolesData = await client.query(`
        SELECT clerk_user_id, role, signup_method
        FROM user_roles;
      `);
      
      console.log(`user_roles에 ${rolesData.rows.length}명의 사용자가 있습니다.`);
      
      // user_profiles 데이터 확인
      const profilesData = await client.query(`
        SELECT clerk_user_id, email, signup_method
        FROM user_profiles;
      `);
      
      console.log(`user_profiles에 ${profilesData.rows.length}명의 사용자가 있습니다.`);

      console.log('\\n2. user_roles 데이터를 기반으로 user_profiles 생성...');
      
      // user_roles의 각 사용자에 대해 user_profiles 레코드 생성 또는 업데이트
      for (const roleRow of rolesData.rows) {
        const { clerk_user_id, signup_method } = roleRow;
        
        // 해당 사용자의 user_profiles 레코드가 있는지 확인
        const existingProfile = await client.query(`
          SELECT id FROM user_profiles WHERE clerk_user_id = $1;
        `, [clerk_user_id]);
        
        if (existingProfile.rows.length > 0) {
          // 기존 프로필 업데이트
          await client.query(`
            UPDATE user_profiles 
            SET signup_method = $1, updated_at = now()
            WHERE clerk_user_id = $2;
          `, [signup_method, clerk_user_id]);
          console.log(`  - ${clerk_user_id}: 프로필 업데이트 (signup_method: ${signup_method})`);
        } else {
          // 새 프로필 생성 (이메일은 임시로 clerk_user_id 기반으로 생성)
          const tempEmail = `${clerk_user_id}@temp.local`;
          await client.query(`
            INSERT INTO user_profiles (clerk_user_id, email, signup_method, created_at, updated_at)
            VALUES ($1, $2, $3, now(), now());
          `, [clerk_user_id, tempEmail, signup_method]);
          console.log(`  - ${clerk_user_id}: 새 프로필 생성 (signup_method: ${signup_method})`);
        }
      }

      console.log('\\n3. user_roles에서 signup_method 컬럼 제거...');
      
      // signup_method 컬럼이 존재하는지 확인
      const columnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles' 
        AND column_name = 'signup_method';
      `);
      
      if (columnExists.rows.length > 0) {
        await client.query(`
          ALTER TABLE user_roles 
          DROP COLUMN signup_method;
        `);
        console.log('  - signup_method 컬럼이 user_roles에서 제거되었습니다.');
      } else {
        console.log('  - signup_method 컬럼이 이미 존재하지 않습니다.');
      }

      console.log('\\n4. 최종 결과 확인...');
      
      // user_roles 구조 확인
      const finalRolesStructure = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'user_roles' 
        ORDER BY ordinal_position;
      `);
      
      console.log('user_roles 최종 구조:');
      finalRolesStructure.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      
      // user_profiles 데이터 확인
      const finalProfilesData = await client.query(`
        SELECT clerk_user_id, signup_method
        FROM user_profiles;
      `);
      
      console.log('\\nuser_profiles 최종 데이터:');
      finalProfilesData.rows.forEach(row => {
        console.log(`  - ${row.clerk_user_id}: signup_method='${row.signup_method}'`);
      });

      // 트랜잭션 커밋
      await client.query('COMMIT');
      console.log('\\n✅ 마이그레이션이 성공적으로 완료되었습니다.');

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

migrateSignupMethodToProfiles();
