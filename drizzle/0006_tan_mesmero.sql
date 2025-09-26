CREATE TABLE "weekly_air_quality_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_time" text NOT NULL,
	"inform_code" text NOT NULL,
	"inform_data" text NOT NULL,
	"search_date" text NOT NULL,
	"inform_overall" text NOT NULL,
	"inform_cause" text,
	"inform_grade" text,
	"action_knack" text,
	"daily_forecasts" jsonb,
	"image_urls" jsonb,
	"raw_data" jsonb,
	"cache_key" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
