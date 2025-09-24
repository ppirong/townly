CREATE TABLE "user_selected_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"station_name" text NOT NULL,
	"sido" text NOT NULL,
	"is_auto_selected" boolean DEFAULT false NOT NULL,
	"distance" integer,
	"station_address" text,
	"user_latitude" text,
	"user_longitude" text,
	"is_default" boolean DEFAULT true NOT NULL,
	"selected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_selected_stations_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
