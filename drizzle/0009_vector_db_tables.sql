-- 날씨 정보 벡터 임베딩 테이블
CREATE TABLE IF NOT EXISTS "weather_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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

-- ChatGPT 대화 히스토리 테이블
CREATE TABLE IF NOT EXISTS "chatgpt_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"user_question" text NOT NULL,
	"retrieved_context" jsonb,
	"gpt_response" text NOT NULL,
	"tokens_used" integer,
	"response_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS "idx_weather_embeddings_location" ON "weather_embeddings" ("location_name");
CREATE INDEX IF NOT EXISTS "idx_weather_embeddings_content_type" ON "weather_embeddings" ("content_type");
CREATE INDEX IF NOT EXISTS "idx_weather_embeddings_forecast_date" ON "weather_embeddings" ("forecast_date");
CREATE INDEX IF NOT EXISTS "idx_weather_embeddings_created_at" ON "weather_embeddings" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_chatgpt_conversations_user_id" ON "chatgpt_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chatgpt_conversations_session_id" ON "chatgpt_conversations" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_chatgpt_conversations_created_at" ON "chatgpt_conversations" ("created_at");
