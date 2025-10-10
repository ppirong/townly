-- 새로운 mart_discount_items 테이블 생성 (날짜별 할인 상품 정보)
CREATE TABLE IF NOT EXISTS "mart_discount_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "discount_id" uuid NOT NULL REFERENCES "mart_discounts"("id") ON DELETE CASCADE,
  "discount_date" timestamp NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "image_url" text,
  "original_image_url" text,
  "image_size" integer,
  "ocr_analyzed" boolean DEFAULT false,
  "products" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX "mart_discount_items_discount_id_idx" ON "mart_discount_items" ("discount_id");
CREATE INDEX "mart_discount_items_discount_date_idx" ON "mart_discount_items" ("discount_date");
