const { neon } = require('@neondatabase/serverless');
const { readFileSync } = require('fs');
const { join } = require('path');
const dotenv = require('dotenv');

// .env.local 파일 로드
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function runMigration(sqlFilePath) {
  try {
    console.log(`🔄 마이그레이션 실행 중: ${sqlFilePath}...`);
    
    // SQL 파일 읽기
    const sqlContent = readFileSync(join(process.cwd(), sqlFilePath), 'utf-8');
    
    // SQL을 여러 구문으로 분할하여 실행
    const statements = sqlContent.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('실행 중:', statement.trim().substring(0, 50) + '...');
        await sql.query(statement.trim());
      }
    }
    
    console.log('✅ 마이그레이션이 성공적으로 실행되었습니다!');
    
    // 테이블 존재 확인
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('📋 테이블 목록:', tables.map(t => t.table_name));
    
    // 마트 할인 테이블 컬럼 확인
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mart_discounts' 
      ORDER BY column_name;
    `;
    
    console.log('📋 mart_discounts 테이블 컬럼:', columns.map(c => `${c.column_name} (${c.data_type})`));
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류:', error);
    process.exit(1);
  }
}

// 명령줄 인자로 SQL 파일 경로 받기
const sqlFilePath = process.argv[2];

if (!sqlFilePath) {
  console.error('❌ SQL 파일 경로를 지정해주세요.');
  console.log('사용법: npx tsx scripts/run-custom-migration.js <SQL_FILE_PATH>');
  process.exit(1);
}

runMigration(sqlFilePath);
