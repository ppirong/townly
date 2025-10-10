ALTER TABLE "mart_discounts" ADD COLUMN "discount_date" timestamp;
ALTER TABLE "mart_discounts" ADD COLUMN "original_image_url" text;
ALTER TABLE "mart_discounts" ADD COLUMN "image_size" integer;
ALTER TABLE "mart_discounts" ADD COLUMN "ocr_analyzed" boolean DEFAULT false;
ALTER TABLE "mart_discounts" ADD COLUMN "products" jsonb;
