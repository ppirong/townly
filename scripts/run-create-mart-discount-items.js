// mart_discount_items 테이블 생성 스크립트
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runCreateMartDiscountItems() {
  try {
    console.log('mart_discount_items 테이블 생성 시작...');
    
    // 데이터베이스 연결
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }
    
    console.log(`연결 문자열: ${connectionString}`);
    
    const client = new Client({ connectionString });
    await client.connect();
    
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../drizzle/0018_create_mart_discount_items.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('SQL 실행 중...');
    await client.query(sql);
    
    console.log('mart_discount_items 테이블이 성공적으로 생성되었습니다.');
    
    await client.end();
  } catch (error) {
    console.error('테이블 생성 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

runCreateMartDiscountItems()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  });
