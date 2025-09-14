import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * 마이그레이션 API (인증 없이 사용 가능)
 * 개발 환경에서만 사용
 */
export async function POST(request: NextRequest) {
  // 보안을 위해 개발 환경에서만 허용
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Only available in development environment' },
      { status: 403 }
    );
  }

  try {
    console.log('🔄 스케줄 메시지 테이블 마이그레이션 시작...');

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
    let foreignKeyAdded = false;
    try {
      await db.execute(sql`
        ALTER TABLE "scheduled_message_logs" 
        ADD CONSTRAINT "scheduled_message_logs_scheduled_message_id_scheduled_messages_id_fk" 
        FOREIGN KEY ("scheduled_message_id") REFERENCES "public"."scheduled_messages"("id") 
        ON DELETE no action ON UPDATE no action;
      `);
      console.log('✅ 외래키 제약조건 추가 완료');
      foreignKeyAdded = true;
    } catch (constraintError) {
      if (constraintError instanceof Error && constraintError.message.includes('already exists')) {
        console.log('ℹ️ 외래키 제약조건이 이미 존재합니다');
        foreignKeyAdded = true;
      } else {
        console.warn('⚠️ 외래키 제약조건 추가 실패:', constraintError);
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

    // 컬럼 정보도 확인
    const columns = await db.execute(sql`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('scheduled_messages', 'scheduled_message_logs')
      ORDER BY table_name, ordinal_position;
    `);

    return NextResponse.json({
      success: true,
      message: '스케줄 메시지 테이블 마이그레이션이 완료되었습니다',
      tables: Array.isArray(tables) ? tables.map((t: any) => t.table_name) : [],
      columns: Array.isArray(columns) ? columns.length : 0,
      foreignKeyAdded,
      details: {
        tablesCreated: Array.isArray(tables) ? tables.length : 0,
        columnsTotal: Array.isArray(columns) ? columns.length : 0,
      },
      rawTables: tables,
      rawColumns: columns,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * 마이그레이션 상태 확인 (GET 요청)
 */
export async function GET() {
  try {
    // 테이블 존재 확인
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('scheduled_messages', 'scheduled_message_logs')
      ORDER BY table_name;
    `);

    // 컬럼 정보 확인
    const columns = await db.execute(sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('scheduled_messages', 'scheduled_message_logs')
      ORDER BY table_name, ordinal_position;
    `);

    // 제약조건 확인
    const constraints = await db.execute(sql`
      SELECT constraint_name, table_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name IN ('scheduled_messages', 'scheduled_message_logs')
      ORDER BY table_name, constraint_name;
    `);

    const tableRows = Array.isArray(tables) ? tables : (tables?.rows || []);
    const constraintRows = Array.isArray(constraints) ? constraints : (constraints?.rows || []);
    
    const scheduledMessagesExists = tableRows.some((t: any) => t.table_name === 'scheduled_messages');
    const scheduledMessageLogsExists = tableRows.some((t: any) => t.table_name === 'scheduled_message_logs');
    const foreignKeyExists = constraintRows.some((c: any) => c.constraint_name && c.constraint_name.includes('fk'));

    return NextResponse.json({
      success: true,
      migrationStatus: {
        scheduled_messages: scheduledMessagesExists,
        scheduled_message_logs: scheduledMessageLogsExists,
        foreign_key_constraint: foreignKeyExists,
        ready_for_use: scheduledMessagesExists && scheduledMessageLogsExists,
      },
      tables: tableRows.map((t: any) => t.table_name),
      columns: Array.isArray(columns) ? columns.length : (columns?.rows?.length || 0),
      constraints: constraintRows.length,
      environment: process.env.NODE_ENV,
      rawData: { tables, columns, constraints },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 마이그레이션 상태 확인 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
