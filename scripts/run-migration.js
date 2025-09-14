const { neon } = require('@neondatabase/serverless');
const { readFileSync } = require('fs');
const { join } = require('path');
const dotenv = require('dotenv');

// .env.local 파일 로드
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('🔄 스케줄 메시지 테이블 생성 중...');
    
    // SQL 파일 읽기
    const sqlContent = readFileSync(join(process.cwd(), 'scripts/create-scheduled-tables.sql'), 'utf-8');
    
    // SQL을 여러 구문으로 분할하여 실행
    const statements = sqlContent.split('DO $$');
    
    // 첫 번째 부분 (테이블 생성 구문들) 실행
    const createStatements = statements[0].split(';').filter(s => s.trim());
    
    for (const statement of createStatements) {
      if (statement.trim()) {
        console.log('실행 중:', statement.trim().substring(0, 50) + '...');
        await sql([statement.trim()]);
      }
    }
    
    // 두 번째 부분 (DO $$ 블록) 실행
    if (statements.length > 1) {
      const doBlock = 'DO $$' + statements[1];
      console.log('외래키 제약조건 추가 중...');
      await sql([doBlock.trim()]);
    }
    
    console.log('✅ 스케줄 메시지 테이블이 성공적으로 생성되었습니다!');
    
    // 테이블 존재 확인
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('scheduled_messages', 'scheduled_message_logs')
      ORDER BY table_name;
    `;
    
    console.log('📋 생성된 테이블:', tables.map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류:', error);
    process.exit(1);
  }
}

runMigration();
