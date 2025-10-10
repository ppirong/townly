const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function checkTableStructure() {
  try {
    console.log('🔍 mart_discounts 테이블 구조 확인 중...');
    const tableInfo = await sql.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mart_discounts'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 테이블 구조:');
    console.log(JSON.stringify(tableInfo, null, 2));
    
  } catch (error) {
    console.error('❌ 테이블 구조 확인 중 오류:', error);
    process.exit(1);
  }
}

checkTableStructure();