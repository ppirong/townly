-- start_date와 end_date 컬럼을 nullable로 변경
ALTER TABLE "mart_discounts" ALTER COLUMN "start_date" DROP NOT NULL;
ALTER TABLE "mart_discounts" ALTER COLUMN "end_date" DROP NOT NULL;
