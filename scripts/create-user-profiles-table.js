/**
 * user_profiles 테이블을 생성하는 스크립트
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createUserProfilesTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('데이터베이스에 연결되었습니다.');

    // 테이블이 이미 존재하는지 확인
    const checkTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles';
    `;
    
    const tableExists = await client.query(checkTableQuery);
    
    if (tableExists.rows.length > 0) {
      console.log('user_profiles 테이블이 이미 존재합니다.');
      return;
    }

    // user_profiles 테이블 생성
    const createTableQuery = `
      CREATE TABLE user_profiles (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        clerk_user_id text NOT NULL UNIQUE,
        email text NOT NULL,
        first_name text,
        last_name text,
        image_url text,
        signup_method text DEFAULT 'email' NOT NULL,
        preferences jsonb,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      );
    `;
    
    await client.query(createTableQuery);
    console.log('user_profiles 테이블이 성공적으로 생성되었습니다.');

    // 인덱스 생성
    const createIndexQuery = `
      CREATE INDEX idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id);
    `;
    
    await client.query(createIndexQuery);
    console.log('인덱스가 성공적으로 생성되었습니다.');

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.end();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
}

createUserProfilesTable();
