ALTER TABLE "kakao_messages" ADD COLUMN "ai_response" text;--> statement-breakpoint
ALTER TABLE "kakao_messages" ADD COLUMN "response_type" text DEFAULT 'chatgpt';--> statement-breakpoint
ALTER TABLE "kakao_messages" ADD COLUMN "processing_time" text;