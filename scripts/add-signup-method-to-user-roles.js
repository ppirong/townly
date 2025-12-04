/**
 * user_roles 테이블에 signup_method 컬럼을 추가하는 스크립트
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addSignupMethodColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('데이터베이스에 연결되었습니다.');

    // 컬럼이 이미 존재하는지 확인
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' 
      AND column_name = 'signup_method';
    `;
    
    const columnExists = await client.query(checkColumnQuery);
    
    if (columnExists.rows.length > 0) {
      console.log('signup_method 컬럼이 이미 존재합니다.');
      return;
    }

    // signup_method 컬럼 추가
    const addColumnQuery = `
      ALTER TABLE user_roles 
      ADD COLUMN signup_method text DEFAULT 'email' NOT NULL;
    `;
    
    await client.query(addColumnQuery);
    console.log('signup_method 컬럼이 성공적으로 추가되었습니다.');

    // 기존 사용자들을 모두 이메일 회원가입으로 설정
    const updateExistingUsersQuery = `
      UPDATE user_roles 
      SET signup_method = 'email' 
      WHERE signup_method IS NULL OR signup_method = '';
    `;
    
    const result = await client.query(updateExistingUsersQuery);
    console.log(`${result.rowCount}명의 기존 사용자가 이메일 회원가입으로 설정되었습니다.`);

    // 현재 사용자 수 확인
    const countQuery = `SELECT COUNT(*) as count FROM user_roles;`;
    const countResult = await client.query(countQuery);
    console.log(`총 사용자 수: ${countResult.rows[0].count}명`);

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.end();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
}

addSignupMethodColumn();
