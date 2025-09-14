-- 스케줄 메시지 테이블 생성 (존재하지 않는 경우에만)
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

-- 스케줄 메시지 로그 테이블 생성 (존재하지 않는 경우에만)
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

-- 외래키 제약조건 추가 (존재하지 않는 경우에만)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'scheduled_message_logs_scheduled_message_id_scheduled_messages_id_fk'
    ) THEN
        ALTER TABLE "scheduled_message_logs" 
        ADD CONSTRAINT "scheduled_message_logs_scheduled_message_id_scheduled_messages_id_fk" 
        FOREIGN KEY ("scheduled_message_id") REFERENCES "public"."scheduled_messages"("id") 
        ON DELETE no action ON UPDATE no action;
    END IF;
END $$;
