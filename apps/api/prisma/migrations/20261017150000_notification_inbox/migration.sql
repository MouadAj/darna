ALTER TABLE "Notification" ADD COLUMN "data" JSONB;
CREATE INDEX "Notification_householdId_userId_createdAt_id_idx" ON "Notification"("householdId", "userId", "createdAt", "id");
