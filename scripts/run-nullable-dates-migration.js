const { neon } = require('@neondatabase/serverless');
const { readFileSync } = require('fs');
const { join } = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('🔄 start_date와 end_date 컬럼을 nullable로 변경하는 마이그레이션 실행 중...');
    
    const migrationFile = 'drizzle/0016_nullable_start_end_dates.sql';
    const sqlContent = readFileSync(join(process.cwd(), migrationFile), 'utf-8');
    const statements = sqlContent.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('실행 중:', statement.trim());
        await sql.query(statement.trim());
      }
    }
    
    console.log('✅ 마이그레이션이 성공적으로 실행되었습니다!');
    
    // 테이블 구조 확인
    console.log('🔍 mart_discounts 테이블 구조 확인 중...');
    const tableInfo = await sql.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mart_discounts'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 테이블 구조:');
    console.table(tableInfo.rows);
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류:', error);
    process.exit(1);
  }
}

runMigration();
