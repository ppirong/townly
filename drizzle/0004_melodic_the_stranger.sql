CREATE TABLE "user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"address" text,
	"city_name" text,
	"is_default" boolean DEFAULT true NOT NULL,
	"nickname" text,
	"accuracy" integer,
	"source" text DEFAULT 'gps' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_locations_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
