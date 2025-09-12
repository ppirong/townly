CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" text NOT NULL,
	"url" text NOT NULL,
	"user_agent" text,
	"request_body" text,
	"request_headers" jsonb,
	"status_code" text NOT NULL,
	"response_body" text,
	"processing_time" text,
	"error_message" text,
	"ip_address" text,
	"is_successful" boolean DEFAULT true,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
