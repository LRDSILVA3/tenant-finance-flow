-- Add enable_commission to user_settings
ALTER TABLE "user_settings" ADD COLUMN "enable_commission" BOOLEAN NOT NULL DEFAULT false;

-- Create collaborators table
CREATE TABLE "collaborators" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "client_id" UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add collaborator_id and commission_amount to transactions
ALTER TABLE "transactions" ADD COLUMN "collaborator_id" UUID REFERENCES collaborators(id) ON DELETE SET NULL;
ALTER TABLE "transactions" ADD COLUMN "commission_amount" NUMERIC(10, 2);
