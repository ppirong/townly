import dotenv from 'dotenv';

// .env.local 파일 로드 (다른 import보다 먼저)
dotenv.config({ path: '.env.local' });

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function createScheduledTables() {
  try {
    console.log('🔄 스케줄 메시지 테이블 생성 중...');

    // scheduled_messages 테이블 생성
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scheduled_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "title" text NOT NULL,
        "message" text NOT NULL,
        "schedule_type" text NOT NULL,
        "schedule_time" text NOT NULL,
        "schedule_day" integer,
        "timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
        "target_type" text DEFAULT 'all' NOT NULL,
        "target_users" jsonb,
        "is_active" boolean DEFAULT true NOT NULL,
        "last_sent_at" timestamp,
        "next_send_at" timestamp NOT NULL,
        "total_sent_count" integer DEFAULT 0 NOT NULL,
        "created_by" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ scheduled_messages 테이블 생성 완료');

    // scheduled_message_logs 테이블 생성
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scheduled_message_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "scheduled_message_id" uuid NOT NULL,
        "sent_at" timestamp DEFAULT now() NOT NULL,
        "recipient_count" integer NOT NULL,
        "success_count" integer NOT NULL,
        "failure_count" integer DEFAULT 0 NOT NULL,
        "error_message" text,
        "is_successful" boolean DEFAULT true NOT NULL,
        "execution_time" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ scheduled_message_logs 테이블 생성 완료');

    // 외래키 제약조건 추가
    try {
      await db.execute(sql`
        ALTER TABLE "scheduled_message_logs" 
        ADD CONSTRAINT "scheduled_message_logs_scheduled_message_id_scheduled_messages_id_fk" 
        FOREIGN KEY ("scheduled_message_id") REFERENCES "public"."scheduled_messages"("id") 
        ON DELETE no action ON UPDATE no action;
      `);
      console.log('✅ 외래키 제약조건 추가 완료');
    } catch (error) {
      // 제약조건이 이미 존재하는 경우 무시
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('ℹ️ 외래키 제약조건이 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // 테이블 존재 확인
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('scheduled_messages', 'scheduled_message_logs')
      ORDER BY table_name;
    `);

    console.log('📋 생성된 테이블:', tables.rows?.map((t: any) => t.table_name) || []);
    console.log('🎉 모든 스케줄 메시지 테이블이 성공적으로 생성되었습니다!');

  } catch (error) {
    console.error('❌ 테이블 생성 중 오류:', error);
    process.exit(1);
  }
}

createScheduledTables();
