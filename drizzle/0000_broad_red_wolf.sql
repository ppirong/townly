CREATE TABLE "kakao_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_key" text NOT NULL,
	"message" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"channel_id" text DEFAULT '68bef0501c4ef66e4f5d73be' NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"raw_data" jsonb,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kakao_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"response" text NOT NULL,
	"response_type" text DEFAULT 'text',
	"admin_user_id" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"is_successful" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kakao_responses" ADD CONSTRAINT "kakao_responses_message_id_kakao_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."kakao_messages"("id") ON DELETE no action ON UPDATE no action;