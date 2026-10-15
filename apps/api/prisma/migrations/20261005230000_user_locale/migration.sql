CREATE TYPE "AppLocale" AS ENUM ('EN', 'FR', 'AR');

ALTER TABLE "User"
ADD COLUMN "preferredLocale" "AppLocale" NOT NULL DEFAULT 'EN';
