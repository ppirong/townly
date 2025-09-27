import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

/**
 * 스케줄 메시지 테이블 생성 API (관리자 전용)
 */
export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: 관리자 로그인이 필요합니다' },
        { status: 401 }
      );
    }

    console.log('🔄 스케줄 메시지 테이블 생성 시작...');

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

    // 외래키 제약조건 추가 시도
    try {
      await db.execute(sql`
        ALTER TABLE "scheduled_message_logs" 
        ADD CONSTRAINT "scheduled_message_logs_scheduled_message_id_scheduled_messages_id_fk" 
        FOREIGN KEY ("scheduled_message_id") REFERENCES "public"."scheduled_messages"("id") 
        ON DELETE no action ON UPDATE no action;
      `);
      console.log('✅ 외래키 제약조건 추가 완료');
    } catch (constraintError) {
      // 제약조건이 이미 존재하는 경우 무시
      if (constraintError instanceof Error && constraintError.message.includes('already exists')) {
        console.log('ℹ️ 외래키 제약조건이 이미 존재합니다');
      } else {
        console.warn('⚠️ 외래키 제약조건 추가 실패:', constraintError);
        // 외래키 실패는 치명적이지 않으므로 계속 진행
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

    console.log('📋 확인된 테이블:', tables);

    return NextResponse.json({
      success: true,
      message: '스케줄 메시지 테이블이 성공적으로 생성되었습니다',
      tables: tables.rows?.map((t: any) => t.table_name) || [],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 테이블 생성 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * 테이블 존재 확인 (GET 요청)
 */
export async function GET() {
  try {
    const tables = await db.execute(sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('scheduled_messages', 'scheduled_message_logs')
      ORDER BY table_name, ordinal_position;
    `);

    return NextResponse.json({
      success: true,
      message: '테이블 정보 조회 완료',
      tables,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 테이블 정보 조회 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
