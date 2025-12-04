-- Add signup_method column to user_profiles table
ALTER TABLE "user_profiles" ADD COLUMN "signup_method" text DEFAULT 'email' NOT NULL;

-- Update existing users to have 'email' as signup method
UPDATE "user_profiles" SET "signup_method" = 'email' WHERE "signup_method" IS NULL;
