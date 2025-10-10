-- 원본 OCR 분석 결과를 저장하기 위한 필드 추가
ALTER TABLE "mart_discount_items" ADD COLUMN "original_products" jsonb;
