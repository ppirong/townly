CREATE TABLE "api_call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_provider" text NOT NULL,
	"api_endpoint" text NOT NULL,
	"http_method" text DEFAULT 'GET' NOT NULL,
	"call_date" text NOT NULL,
	"call_time" timestamp DEFAULT now() NOT NULL,
	"http_status" integer,
	"response_time" integer,
	"is_successful" boolean DEFAULT true NOT NULL,
	"user_id" text,
	"request_params" jsonb,
	"error_message" text,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_api_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stat_date" text NOT NULL,
	"api_provider" text NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"successful_calls" integer DEFAULT 0 NOT NULL,
	"failed_calls" integer DEFAULT 0 NOT NULL,
	"avg_response_time" integer,
	"max_response_time" integer,
	"min_response_time" integer,
	"endpoint_stats" jsonb,
	"hourly_stats" jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"is_finalized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
