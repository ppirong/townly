#!/usr/bin/env tsx

import { config } from 'dotenv';
import { join } from 'path';

// .env.local 파일 로드
config({ path: join(process.cwd(), '.env.local') });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

async function createVectorTables() {
  try {
    console.log('🚀 벡터 데이터베이스 테이블 생성 시작...');
    
    const sqlFilePath = join(process.cwd(), 'drizzle', '0009_vector_db_tables.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');
    
    // SQL을 세미콜론으로 분리해서 각각 실행
    const statements = sqlContent.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const preview = statement.trim().substring(0, 60) + '...';
        console.log('실행 중:', preview);
        
        try {
          await db.execute(sql.raw(statement.trim()));
          console.log('✅ 성공');
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log('⚠️ 이미 존재함');
          } else {
            console.error('❌ 오류:', error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('🎉 벡터 데이터베이스 테이블 생성 완료');
    
    // 테이블 확인
    console.log('\n📊 생성된 테이블 확인...');
    const tables = await db.execute(sql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('weather_embeddings', 'chatgpt_conversations')
      ORDER BY table_name;
    `));
    
    console.log('생성된 테이블:', tables.rows.map((r: any) => r.table_name));
    
  } catch (error) {
    console.error('❌ 전체 프로세스 실패:', error);
    process.exit(1);
  }
}

// 실행
createVectorTables();
