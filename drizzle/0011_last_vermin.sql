CREATE TABLE "email_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"email_subject" text NOT NULL,
	"email_template" text NOT NULL,
	"schedule_time" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"target_type" text DEFAULT 'all_users' NOT NULL,
	"target_user_ids" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sent_at" timestamp,
	"next_send_at" timestamp NOT NULL,
	"total_sent_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_send_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_schedule_id" uuid,
	"email_type" text NOT NULL,
	"subject" text NOT NULL,
	"recipient_count" integer NOT NULL,
	"success_count" integer NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"weather_data_used" jsonb,
	"ai_summary" text,
	"forecast_period" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"execution_time" integer,
	"is_successful" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"failed_emails" jsonb,
	"initiated_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "individual_email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_send_log_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"email_content" text,
	"status" text NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"gmail_message_id" text,
	"gmail_thread_id" text,
	"error_code" text,
	"error_message" text,
	"is_opened" boolean DEFAULT false,
	"opened_at" timestamp,
	"is_clicked" boolean DEFAULT false,
	"clicked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_email_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"receive_weather_emails" boolean DEFAULT true NOT NULL,
	"receive_morning_email" boolean DEFAULT true NOT NULL,
	"receive_evening_email" boolean DEFAULT true NOT NULL,
	"preferred_language" text DEFAULT 'ko' NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"is_subscribed" boolean DEFAULT true NOT NULL,
	"unsubscribed_at" timestamp,
	"unsubscribe_reason" text,
	"total_emails_sent" integer DEFAULT 0 NOT NULL,
	"last_email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_settings_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_email_schedule_id_email_schedules_id_fk" FOREIGN KEY ("email_schedule_id") REFERENCES "public"."email_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "individual_email_logs" ADD CONSTRAINT "individual_email_logs_email_send_log_id_email_send_logs_id_fk" FOREIGN KEY ("email_send_log_id") REFERENCES "public"."email_send_logs"("id") ON DELETE no action ON UPDATE no action;