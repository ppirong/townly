CREATE TABLE IF NOT EXISTS "marts" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "region" text NOT NULL,
  "address" text,
  "phone" text,
  "email" text,
  "website" text,
  "latitude" text,
  "longitude" text,
  "is_verified" boolean DEFAULT false,
  "is_fast_response" boolean DEFAULT false,
  "is_business_registered" boolean DEFAULT false,
  "hire_count" integer DEFAULT 0,
  "response_time" text DEFAULT '24시간',
  "portfolio_count" integer DEFAULT 0,
  "photo_count" integer DEFAULT 0,
  "logo_url" text,
  "portfolio_urls" jsonb,
  "photo_urls" jsonb,
  "created_by" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "mart_discounts" (
  "id" uuid PRIMARY KEY,
  "mart_id" uuid NOT NULL REFERENCES "marts"("id"),
  "title" text NOT NULL,
  "description" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "discount_rate" text,
  "image_url" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
