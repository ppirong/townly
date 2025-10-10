// 마트 할인 전단지 테이블 구조 변경 마이그레이션 스크립트
require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const path = require('path');
const fs = require('fs');

// 데모 목적으로 하드코딩된 연결 문자열 사용 (실제 환경에서는 환경 변수 사용 권장)
const DEMO_CONNECTION_STRING = 'postgres://postgres:postgres@localhost:5432/townly';

async function runMigration() {
  try {
    console.log('마트 할인 전단지 테이블 구조 변경 마이그레이션 시작...');
    
    // 데이터베이스 연결
    const connectionString = process.env.DATABASE_URL || DEMO_CONNECTION_STRING;
    console.log(`연결 문자열: ${connectionString}`);
    
    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql);
    
    // 마이그레이션 실행
    const migrationPath = path.join(__dirname, '../drizzle/0017_mart_discount_restructure.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('마이그레이션 SQL 실행 중...');
    await sql.unsafe(migrationSQL);
    
    console.log('마이그레이션이 성공적으로 완료되었습니다.');
    
    // 기존 데이터 마이그레이션
    console.log('기존 데이터 마이그레이션 중...');
    
    // 기존 mart_discounts_old 테이블에서 데이터 가져오기
    const oldDiscounts = await sql`SELECT * FROM mart_discounts_old`;
    console.log(`기존 할인 전단지 ${oldDiscounts.length}개를 마이그레이션합니다.`);
    
    // 데이터 변환 및 삽입
    for (const oldDiscount of oldDiscounts) {
      // 1. 할인 전단지 메타 정보 삽입
      const [newDiscount] = await sql`
        INSERT INTO mart_discounts (
          id, mart_id, title, description, start_date, end_date, discount_rate, created_at, updated_at
        ) VALUES (
          ${oldDiscount.id},
          ${oldDiscount.mart_id},
          ${oldDiscount.title},
          ${oldDiscount.description},
          ${oldDiscount.discount_date || new Date()},
          ${oldDiscount.discount_date ? new Date(oldDiscount.discount_date.getTime() + 86400000) : new Date(Date.now() + 86400000)},
          ${oldDiscount.discount_rate},
          ${oldDiscount.created_at},
          ${oldDiscount.updated_at}
        ) RETURNING id
      `;
      
      // 2. 할인 상품 항목 삽입
      await sql`
        INSERT INTO mart_discount_items (
          discount_id, discount_date, title, description, image_url, original_image_url, 
          image_size, ocr_analyzed, products, created_at, updated_at
        ) VALUES (
          ${newDiscount.id},
          ${oldDiscount.discount_date || new Date()},
          ${oldDiscount.title},
          ${oldDiscount.description},
          ${oldDiscount.image_url},
          ${oldDiscount.original_image_url},
          ${oldDiscount.image_size},
          ${oldDiscount.ocr_analyzed || false},
          ${oldDiscount.products || null},
          ${oldDiscount.created_at},
          ${oldDiscount.updated_at}
        )
      `;
    }
    
    console.log('기존 데이터 마이그레이션이 완료되었습니다.');
    
    // 연결 종료
    await sql.end();
    
    console.log('마이그레이션 작업이 모두 완료되었습니다.');
    
  } catch (error) {
    console.error('마이그레이션 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

runMigration();
