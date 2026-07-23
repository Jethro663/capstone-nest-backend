-- Add metadata column to notifications table for deep-link navigation context
ALTER TABLE "notifications" ADD COLUMN "metadata" jsonb;
