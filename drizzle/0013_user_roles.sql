CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerk_user_id" text NOT NULL UNIQUE,
  "role" text NOT NULL DEFAULT 'customer',
  "permissions" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
