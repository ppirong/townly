CREATE TABLE "chatgpt_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"user_question" text NOT NULL,
	"retrieved_context" jsonb,
	"gpt_response" text NOT NULL,
	"tokens_used" integer,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text,
	"content_type" text NOT NULL,
	"location_name" text NOT NULL,
	"forecast_date" text,
	"forecast_hour" integer,
	"content" text NOT NULL,
	"embedding" text NOT NULL,
	"metadata" jsonb,
	"weather_data_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_weather_data" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "hourly_weather_data" ADD COLUMN "clerk_user_id" text;