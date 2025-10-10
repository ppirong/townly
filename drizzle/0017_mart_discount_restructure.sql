-- 기존 mart_discounts 테이블 이름 변경 (백업용)
ALTER TABLE "mart_discounts" RENAME TO "mart_discounts_old";

-- 새로운 mart_discounts 테이블 생성 (할인 전단지 메타 정보)
CREATE TABLE IF NOT EXISTS "mart_discounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "mart_id" uuid NOT NULL REFERENCES "marts"("id"),
  "title" text NOT NULL,
  "description" text,
  "start_date" timestamp NOT NULL,
  "end_date" timestamp NOT NULL,
  "discount_rate" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

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
CREATE INDEX "mart_discounts_mart_id_idx" ON "mart_discounts" ("mart_id");
CREATE INDEX "mart_discount_items_discount_id_idx" ON "mart_discount_items" ("discount_id");
CREATE INDEX "mart_discount_items_discount_date_idx" ON "mart_discount_items" ("discount_date");
